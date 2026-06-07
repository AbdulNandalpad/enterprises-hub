/**
 * POST /api/demo/auth
 *
 * Validates the demo passcode and sets the eh-demo session cookie.
 * Used exclusively by EnterpriseHub employees during sales demos.
 *
 * Passcode is controlled via the DEMO_PASSCODE env var in Vercel.
 * There is NO hard-coded fallback — the endpoint returns 503 if the env var
 * is not set, so a misconfigured deployment fails loudly rather than silently
 * falling back to a known value.
 *
 * Cookie value is an HMAC-signed token: "<expiry>.<hmac>" so the value cannot
 * be forged by manually setting document.cookie in DevTools.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api-security";

const SESSION_TTL = 60 * 60 * 8; // 8 hours in seconds

/**
 * Derive a fixed-length HMAC key from the demo passcode.
 * Using a hash means the key is always 32 bytes regardless of passcode length.
 */
function deriveKey(passcode: string): Buffer {
  return createHmac("sha256", "eh-demo-key-v1").update(passcode).digest();
}

/**
 * Create a signed demo session token: "<expiry>.<hmac_hex>"
 * The expiry is a Unix timestamp (seconds).
 */
export function createDemoToken(passcode: string): string {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const key = deriveKey(passcode);
  const mac = createHmac("sha256", key).update(String(expiry)).digest("hex");
  return `${expiry}.${mac}`;
}

/**
 * Verify a demo session token.
 * Returns true only if the token was signed with this passcode and is not expired.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyDemoToken(token: string, passcode: string): boolean {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return false;

    const expiryStr = token.slice(0, dotIdx);
    const mac = token.slice(dotIdx + 1);

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

    const key = deriveKey(passcode);
    const expected = createHmac("sha256", key).update(expiryStr).digest();
    const actual = Buffer.from(mac, "hex");

    if (actual.length !== expected.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** DELETE /api/demo/auth — sign out of demo session by clearing the cookie */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("eh-demo", "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 minutes — mirrors the superadmin guard
  const ip = getClientIp(request);
  const rateLimitRes = checkRateLimit(`demo-auth:${ip}`, 10, 15 * 60 * 1000);
  if (rateLimitRes) return rateLimitRes;

  const passcode = process.env.DEMO_PASSCODE;

  // Fail loudly if the env var is not configured — no hard-coded fallback.
  if (!passcode) {
    return NextResponse.json(
      { error: "Demo mode is not configured on this deployment." },
      { status: 503 }
    );
  }

  let submittedPasscode = "";
  try {
    const body = await request.json() as { passcode?: string };
    submittedPasscode = (body.passcode ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!submittedPasscode) {
    return NextResponse.json({ error: "Passcode required" }, { status: 400 });
  }

  // Small delay to slow brute-force regardless of outcome
  await new Promise((r) => setTimeout(r, 400));

  // Timing-safe comparison via HMAC
  const submittedBuf = Buffer.from(submittedPasscode);
  const correctBuf   = Buffer.from(passcode);
  const lengthMatch  = submittedBuf.length === correctBuf.length;
  // Pad to same length before timingSafeEqual to avoid length oracle
  const padded = Buffer.alloc(correctBuf.length);
  submittedBuf.copy(padded, 0, 0, Math.min(submittedBuf.length, padded.length));
  const match = lengthMatch && timingSafeEqual(padded, correctBuf);

  if (!match) {
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  // Issue a signed session token — NOT a plain "1" value.
  // The client can read it (httpOnly: false) but cannot forge a valid token
  // without knowing the DEMO_PASSCODE.
  const token = createDemoToken(passcode);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("eh-demo", token, {
    path:     "/",
    httpOnly: false, // readable by client JS so AuthGuard/dashboard can detect demo mode
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   SESSION_TTL,
  });

  return res;
}
