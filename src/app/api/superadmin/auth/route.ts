/**
 * /api/superadmin/auth
 *
 * Validates the superadmin secret and sets the sa-token cookie.
 * Called by the /superadmin/login page.
 *
 * POST { secret: string } → 200 OK | 401 Unauthorized | 429 Too Many Requests
 * DELETE                  → 200 OK (sign-out)
 *
 * Security:
 *  - Cookie stores an HMAC-signed session token, NOT the raw secret (CRIT-2)
 *  - Wrong-guess delay + in-memory rate limiting per IP (HIGH-2)
 *  - Comparison uses timingSafeEqual inside verifySaSession (CRIT-1)
 */

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createSaSession,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/superadmin-auth";

/** Sign out — clear the sa-token cookie */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sa-token", "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
  return res;
}

export async function POST(req: NextRequest) {
  const saSecret = process.env.SUPERADMIN_SECRET?.trim();

  if (!saSecret) {
    return NextResponse.json(
      { error: "Superadmin access is not configured on this deployment." },
      { status: 503 }
    );
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  if (!checkLoginRateLimit(ip)) {
    await new Promise((r) => setTimeout(r, 2000)); // slow down automated attempts
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── Validate secret ───────────────────────────────────────────────────────
  // Deliberate delay to slow brute-force attempts regardless of outcome
  await new Promise((r) => setTimeout(r, 500));

  // Timing-safe comparison — prevents timing attacks that could leak secret length/content.
  // Pad to equal length so timingSafeEqual doesn't throw on length mismatch.
  const submittedBuf = Buffer.from(body.secret ?? "");
  const correctBuf   = Buffer.from(saSecret);
  const padded = Buffer.alloc(correctBuf.length);
  submittedBuf.copy(padded, 0, 0, Math.min(submittedBuf.length, padded.length));
  const isCorrect = submittedBuf.length === correctBuf.length && timingSafeEqual(padded, correctBuf);

  if (!isCorrect) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  // ── Issue session token ───────────────────────────────────────────────────
  // The cookie stores an HMAC-signed token, NOT the raw secret.
  // Leaking the cookie does not expose the secret.
  resetLoginRateLimit(ip); // clear counter on success
  const sessionToken = createSaSession(saSecret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sa-token", sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours (matches token TTL)
  });
  return res;
}
