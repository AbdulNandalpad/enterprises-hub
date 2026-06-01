/**
 * Superadmin authentication helpers.
 *
 * Single source of truth — import assertSuperadmin from here in every
 * /api/superadmin/* route. Never duplicate this logic.
 *
 * Fixes:
 *  - CRIT-1: timing-safe comparison (timingSafeEqual via HMAC)
 *  - CRIT-2: cookie value ≠ secret (HMAC-signed session token)
 *  - HIGH-2:  in-memory rate limiting on login endpoint
 *  - MED-3:   single canonical implementation, no drift
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// ── Session token helpers ─────────────────────────────────────────────────────
//
// Token format: "{expiry}.{hmac}"
//   expiry = Unix timestamp (seconds)
//   hmac   = HMAC-SHA256(secret, expiry) encoded as hex
//
// The cookie stores this token — NOT the raw SUPERADMIN_SECRET.
// If the cookie leaks, the attacker gets a time-limited token that cannot
// be used to derive the secret.

const SESSION_TTL = 60 * 60 * 8; // 8 hours in seconds

/**
 * Create a signed session token for the superadmin cookie.
 * Called once on successful login.
 */
export function createSaSession(secret: string): string {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const mac = createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${mac}`;
}

/**
 * Verify a session token from the sa-token cookie.
 * Timing-safe: uses HMAC comparison via timingSafeEqual.
 * Returns true only if the token is valid and not expired.
 */
export function verifySaSession(token: string, secret: string): boolean {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return false;

    const expiryStr = token.slice(0, dotIdx);
    const mac       = token.slice(dotIdx + 1);

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

    // Recalculate expected MAC and compare timing-safely
    const expected = createHmac("sha256", secret).update(expiryStr).digest();
    const actual   = Buffer.from(mac, "hex");

    // Lengths must match before timingSafeEqual
    if (actual.length !== expected.length) return false;

    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ── Rate limiter ──────────────────────────────────────────────────────────────
//
// In-memory; resets on cold starts. This is acceptable for a single-admin
// endpoint — the primary protection is the strong secret + timing safety.
// For high-traffic deployments, replace with Upstash Redis + @upstash/ratelimit.

const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS   = 5;

/**
 * Returns true if the IP is within its allowed attempts.
 * Returns false (block) if the IP has exceeded MAX_ATTEMPTS in the window.
 */
export function checkLoginRateLimit(ip: string): boolean {
  const now     = Date.now();
  const entry   = loginAttempts.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;

  loginAttempts.set(ip, { ...entry, count: entry.count + 1 });
  return true;
}

/** Call on successful login to clear the rate-limit counter for this IP. */
export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ── assertSuperadmin ──────────────────────────────────────────────────────────

/**
 * Auth guard for all /api/superadmin/* routes.
 *
 * Returns a 401 NextResponse if the request is not authorised.
 * Returns null if the request is authorised (proceed normally).
 *
 * Usage:
 *   const authErr = assertSuperadmin(req);
 *   if (authErr) return authErr;
 */
export function assertSuperadmin(req: NextRequest): NextResponse | null {
  const saToken  = req.cookies.get("sa-token")?.value;
  const saSecret = process.env.SUPERADMIN_SECRET;

  if (!saSecret) {
    return NextResponse.json(
      { error: "Superadmin is not configured on this deployment." },
      { status: 503 }
    );
  }

  if (!saToken || !verifySaSession(saToken, saSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
