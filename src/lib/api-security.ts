/**
 * Shared security helpers for Next.js API routes.
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
    if (isProduction) return parsed.protocol === "https:";
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
