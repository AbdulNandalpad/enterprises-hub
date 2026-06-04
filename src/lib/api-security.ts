/**
 * Shared security helpers for Next.js API routes.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { ImapCredentials } from "./connectors/imap/types";
import type { CalDavCredentials } from "./connectors/caldav/types";

// ─── AES-256-GCM cookie encryption ───────────────────────────────────────────

/**
 * Derive a 32-byte AES key from the env var (or a dev-only fallback).
 * In production, set COOKIE_ENCRYPTION_KEY to any string (ideally 32+ random bytes as hex/base64).
 * Never log or expose this value.
 */
function getCookieEncryptionKey(): Buffer {
  const raw = process.env.COOKIE_ENCRYPTION_KEY ?? "dev-only-cookie-encryption-key!!";
  // SHA-256 of whatever the operator set — always gives us exactly 32 bytes
  return createHash("sha256").update(raw).digest();
}

/**
 * Encrypt a JSON-serialisable value.
 * Format: "v2:<iv_b64>.<authTag_b64>.<ciphertext_b64>"
 * The "v2:" prefix lets readCookiePayload() detect encrypted vs. legacy plain-base64.
 */
function encryptCookiePayload(value: unknown): string {
  const key = getCookieEncryptionKey();
  const iv  = randomBytes(12); // 96-bit IV is standard for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plain  = JSON.stringify(value);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return `v2:${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

/**
 * Decrypt a cookie payload produced by encryptCookiePayload().
 * Falls back to plain base64-JSON for cookies written before encryption was added.
 * Returns null on any error (caller treats it as "not configured").
 */
function decryptCookiePayload<T>(raw: string): T | null {
  try {
    if (raw.startsWith("v2:")) {
      // Encrypted path
      const inner  = raw.slice(3); // strip "v2:"
      const parts  = inner.split(".");
      if (parts.length !== 3) return null;
      const [ivB64, tagB64, ctB64] = parts;
      const key        = getCookieEncryptionKey();
      const iv         = Buffer.from(ivB64,  "base64");
      const authTag    = Buffer.from(tagB64, "base64");
      const ciphertext = Buffer.from(ctB64,  "base64");
      const decipher   = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      return JSON.parse(plain) as T;
    } else {
      // Legacy: plain base64-JSON (no encryption)
      return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as T;
    }
  } catch {
    return null;
  }
}

// ─── General-purpose rate limiter ────────────────────────────────────────────
//
// In-memory per-IP sliding window. Resets on serverless cold start, which is
// acceptable — the primary protection on AI routes is the API key. On connector
// routes this prevents abuse by authenticated users who want to hammer SAP/SF.
// For multi-region Vercel deployments replace with Upstash Redis.

interface RateBucket { count: number; windowStart: number }
const rateBuckets = new Map<string, RateBucket>();

/**
 * Check whether a request is within the allowed rate.
 *
 * @param key      Unique key — typically `${routeId}:${ip}` or `${routeId}:${email}`
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns 429 NextResponse if over limit, null if allowed
 */
export function checkRateLimit(
  key:      string,
  limit:    number,
  windowMs: number,
): NextResponse | null {
  const now   = Date.now();
  const entry = rateBuckets.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return null; // allowed
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.windowStart + windowMs - now) / 1000)) },
      },
    );
  }

  rateBuckets.set(key, { ...entry, count: entry.count + 1 });
  return null; // allowed
}

/** Extract a client IP from the request (Vercel / standard headers). */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── CSRF guard ──────────────────────────────────────────────────────────────

/**
 * Very lightweight origin check — rejects requests whose Origin header
 * doesn't match our own host.  Browsers always send Origin on cross-site
 * requests; same-site form/fetch from our own pages omit it (safe).
 *
 * For production, replace with a proper CSRF token (e.g. double-submit cookie).
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // same-site request — allowed

  const host = req.headers.get("host");
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: "Cross-origin request blocked" },
      { status: 403 }
    );
  }
  return null;
}

// ─── API key cookie helpers ───────────────────────────────────────────────────

const KEY_COOKIE_PREFIX = "eh_key_";
const KEY_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Derive the cookie name for a given AI provider.
 * e.g. "openai" → "eh_key_openai"
 */
export function keyCookieName(provider: string): string {
  // Allow only safe characters to prevent header injection
  const safe = provider.replace(/[^a-z0-9_-]/gi, "").slice(0, 32);
  return `${KEY_COOKIE_PREFIX}${safe}`;
}

/**
 * Persist an API key in a secure httpOnly cookie.
 * Returns a Set-Cookie header value.
 */
export function buildKeyCookie(
  provider: string,
  key: string,
  isProduction: boolean
): string {
  const name = keyCookieName(provider);
  const flags = [
    `Max-Age=${KEY_MAX_AGE}`,
    "Path=/api",          // only sent to /api/* routes — never to page requests
    "HttpOnly",           // not accessible to JavaScript
    "SameSite=Strict",    // no cross-site sending
    isProduction ? "Secure" : "", // HTTPS only in production
  ]
    .filter(Boolean)
    .join("; ");
  return `${name}=${encodeURIComponent(key)}; ${flags}`;
}

/**
 * Read the stored API key for a provider from the cookie store.
 * Returns null if not set.
 */
export async function readApiKey(provider: string): Promise<string | null> {
  const cookieStore = await cookies();
  const name = keyCookieName(provider);
  const value = cookieStore.get(name)?.value;
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Build a cookie that clears the stored key for a provider.
 */
export function buildClearKeyCookie(provider: string): string {
  const name = keyCookieName(provider);
  return `${name}=; Max-Age=0; Path=/api; HttpOnly; SameSite=Strict`;
}

// ─── Input validation ─────────────────────────────────────────────────────────

/** Allowed AI provider ids */
const VALID_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "gemini",
  "azure-openai",
  "custom",
]);

export function isValidProvider(id: unknown): id is string {
  return typeof id === "string" && VALID_PROVIDERS.has(id);
}

/**
 * Basic API key format check — just structural, not cryptographic.
 * Rejects obvious garbage (too short, contains unsafe chars).
 */
export function isPlausibleApiKey(key: unknown): boolean {
  if (typeof key !== "string") return false;
  if (key.length < 8 || key.length > 512) return false;
  // Allow alphanumeric, hyphens, underscores, dots, colons — typical key formats
  return /^[\w\-.:|/]+$/.test(key);
}

/** Sanitise a URL — must start with https:// (http:// only in dev) */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && parsed.protocol !== "https:") return false;
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    // Block SSRF targets (HIGH-4)
    if (blockSsrfTarget(url)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * SSRF protection — returns true if the URL should be blocked.
 *
 * Blocks:
 *  - Loopback:      localhost, 127.x.x.x, ::1
 *  - Private IPv4:  10.x, 172.16–31.x, 192.168.x
 *  - Link-local:    169.254.x.x (AWS/GCP instance metadata)
 *  - Known metadata hosts
 *  - IPv6 private ranges (fc00::/7, fe80::/10)
 *
 * Used by isSafeUrl (AI custom/Azure URLs) and the image proxy (HIGH-1).
 */
export function blockSsrfTarget(urlString: string): boolean {
  try {
    const hostname = new URL(urlString).hostname.toLowerCase()
      .replace(/^\[/, "").replace(/\]$/, ""); // strip IPv6 brackets

    // Block known metadata endpoints
    const blockedHostnames = [
      "localhost",
      "metadata.google.internal",
      "metadata.internal",
      "169.254.169.254",
    ];
    if (blockedHostnames.includes(hostname)) return true;

    // Block private/loopback IPv4
    const privateIPv4 = [
      /^127\./,                                   // loopback
      /^10\./,                                    // RFC1918
      /^172\.(1[6-9]|2\d|3[01])\./,              // RFC1918
      /^192\.168\./,                              // RFC1918
      /^169\.254\./,                              // link-local / metadata
      /^0\./,                                     // this network
      /^100\.(6[4-9]|[7-9]\d|1([01]\d|2[0-7]))\./, // carrier-grade NAT
    ];
    if (privateIPv4.some((r) => r.test(hostname))) return true;

    // Block private IPv6
    if (
      hostname === "::1" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) return true;

    return false;
  } catch {
    return true; // block on parse error
  }
}

/**
 * Require same-origin when a tenant-level env key is being used.
 *
 * User cookie keys are protected by httpOnly + SameSite=Strict.
 * Tenant env keys (shared) need an explicit Origin check so that
 * server-to-server / curl calls cannot burn credits (HIGH-3).
 *
 * Returns a 401 error if a tenant key is in use and Origin is absent/wrong.
 * Returns null if the check passes.
 */
export function assertOriginForTenantKey(
  req: NextRequest,
  usingTenantKey: boolean
): NextResponse | null {
  if (!usingTenantKey) return null; // user's own cookie key — safe

  const origin = req.headers.get("origin");
  if (!origin) {
    return NextResponse.json(
      { error: "Direct API access not permitted when using a shared key." },
      { status: 401 }
    );
  }

  // Reuse same-origin check
  return assertSameOrigin(req);
}

// ─── IMAP credential cookie helpers ──────────────────────────────────────────

const IMAP_COOKIE_NAME = "eh_imap_creds";
const IMAP_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Scoped only to IMAP routes — not sent to /api/ai/chat or any other route
const IMAP_COOKIE_PATH = "/api/connectors/imap";

/**
 * Encode IMAP credentials into an AES-256-GCM encrypted cookie payload.
 * httpOnly + Secure + SameSite=Strict prevents client access and cross-site use.
 */
export function buildImapCookie(
  creds: ImapCredentials,
  isProduction: boolean
): string {
  const encoded = encryptCookiePayload(creds);
  const flags = [
    `Max-Age=${IMAP_MAX_AGE}`,
    `Path=${IMAP_COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Strict",
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return `${IMAP_COOKIE_NAME}=${encoded}; ${flags}`;
}

/**
 * Read and decrypt IMAP credentials from the cookie store.
 * Backward-compatible: handles both encrypted (v2:) and legacy plain-base64 values.
 * Returns null if not configured or malformed.
 */
export async function readImapCredentials(): Promise<ImapCredentials | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMAP_COOKIE_NAME)?.value;
  if (!value) return null;
  return decryptCookiePayload<ImapCredentials>(value);
}

/**
 * Build a cookie that clears stored IMAP credentials.
 */
export function buildClearImapCookie(): string {
  return `${IMAP_COOKIE_NAME}=; Max-Age=0; Path=${IMAP_COOKIE_PATH}; HttpOnly; SameSite=Strict`;
}

/**
 * Validate that an IMAP credentials object has the required shape.
 */
export function isValidImapCredentials(v: unknown): v is ImapCredentials {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.host === "string" && c.host.trim().length > 0 &&
    typeof c.port === "number" && c.port > 0 && c.port <= 65535 &&
    typeof c.user === "string" && c.user.includes("@") &&
    typeof c.pass === "string" && c.pass.length > 0 &&
    typeof c.tls  === "boolean"
  );
}

// ─── CalDAV credential cookie helpers ────────────────────────────────────────

const CALDAV_COOKIE_NAME = "eh_caldav_creds";
const CALDAV_MAX_AGE     = 60 * 60 * 24 * 30; // 30 days
const CALDAV_COOKIE_PATH = "/api/connectors/caldav";

export function buildCalDavCookie(creds: CalDavCredentials, isProduction: boolean): string {
  const encoded = encryptCookiePayload(creds);
  const flags = [
    `Max-Age=${CALDAV_MAX_AGE}`,
    `Path=${CALDAV_COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Strict",
    isProduction ? "Secure" : "",
  ].filter(Boolean).join("; ");
  return `${CALDAV_COOKIE_NAME}=${encoded}; ${flags}`;
}

export async function readCalDavCredentials(): Promise<CalDavCredentials | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CALDAV_COOKIE_NAME)?.value;
  if (!value) return null;
  return decryptCookiePayload<CalDavCredentials>(value);
}

export function buildClearCalDavCookie(): string {
  return `${CALDAV_COOKIE_NAME}=; Max-Age=0; Path=${CALDAV_COOKIE_PATH}; HttpOnly; SameSite=Strict`;
}

export function isValidCalDavCredentials(v: unknown): v is CalDavCredentials {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.server === "string" && c.server.startsWith("http") &&
    typeof c.user   === "string" && c.user.includes("@") &&
    typeof c.pass   === "string" && c.pass.length > 0
  );
}
