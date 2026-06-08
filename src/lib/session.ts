/**
 * Server-side session management.
 *
 * After Azure AD token verification succeeds, /api/auth/session issues a
 * signed JWT in an httpOnly cookie (eh-session). This cookie carries the
 * user's verified identity and role, so assertAdmin no longer relies solely
 * on same-origin checks.
 *
 * Env var: SESSION_SECRET — any long random string (32+ chars recommended).
 * Rotating it instantly invalidates all active sessions.
 * Required in production; falls back with a warning in development.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash } from "crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSessionKey(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET env var is required in production. " +
        "Add it in Vercel → Project → Settings → Environment Variables."
      );
    }
    console.warn("[dev] SESSION_SECRET not set — using insecure dev-only signing key.");
  }
  // SHA-256 → always 32 bytes regardless of input length
  return new Uint8Array(
    createHash("sha256").update(raw ?? "dev-only-session-key-not-for-production").digest()
  );
}

export interface SessionPayload {
  email:      string;
  role:       string;   // "Admin" | "Manager" | "Member" | ""
  tenantSlug: string;
}

/** Create a signed session JWT. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionKey());
}

/**
 * Verify a session JWT from the eh-session cookie.
 * Returns the payload on success, null on any failure (expired, tampered).
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    const email      = typeof payload.email      === "string" ? payload.email      : null;
    const role       = typeof payload.role       === "string" ? payload.role       : null;
    const tenantSlug = typeof payload.tenantSlug === "string" ? payload.tenantSlug : null;
    if (!email || role === null || !tenantSlug) return null;
    return { email, role, tenantSlug };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE          = "eh-session";
export const SESSION_TTL             = SESSION_TTL_SECONDS;
