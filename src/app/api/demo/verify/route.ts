/**
 * GET /api/demo/verify
 *
 * Validates the eh-demo cookie server-side.
 * Called by AuthGuard (client component) to confirm demo mode is legitimate
 * and hasn't been forged via DevTools.
 *
 * Returns { valid: true } if the cookie holds a valid HMAC-signed token.
 * Returns { valid: false } if absent, expired, or tampered with.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyDemoToken } from "@/app/api/demo/auth/route";

export async function GET(request: NextRequest) {
  const passcode = process.env.DEMO_PASSCODE?.trim();

  // If demo isn't configured, it's definitely not valid
  if (!passcode) {
    return NextResponse.json({ valid: false });
  }

  const token = request.cookies.get("eh-demo")?.value;
  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const valid = verifyDemoToken(token, passcode);
  return NextResponse.json({ valid });
}
