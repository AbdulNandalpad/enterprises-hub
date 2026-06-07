/**
 * POST /api/demo/auth
 *
 * Validates the demo passcode and sets the eh-demo session cookie.
 * Used exclusively by EnterpriseHub employees during sales demos.
 *
 * Passcode is controlled via the DEMO_PASSCODE env var in Vercel.
 * Falls back to a hard-coded default for local dev only.
 */

import { NextRequest, NextResponse } from "next/server";

const DEMO_PASSCODE = process.env.DEMO_PASSCODE ?? "EH-DEMO-2026";

export async function POST(request: NextRequest) {
  let passcode = "";
  try {
    const body = await request.json() as { passcode?: string };
    passcode = (body.passcode ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!passcode || passcode !== DEMO_PASSCODE) {
    // Small delay to slow brute-force
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // Readable by client JS (httpOnly: false) so the dashboard can detect demo mode
  res.cookies.set("eh-demo", "1", {
    path:     "/",
    httpOnly: false,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 8, // 8 hours — enough for a working day of demos
  });

  return res;
}
