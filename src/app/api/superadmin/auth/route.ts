/**
 * /api/superadmin/auth
 *
 * Validates the superadmin secret and sets the sa-token cookie.
 * Called by the /superadmin/login page.
 *
 * POST { secret: string } → 200 OK | 401 Unauthorized
 */

import { NextRequest, NextResponse } from "next/server";

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
  const saSecret = process.env.SUPERADMIN_SECRET;

  if (!saSecret) {
    return NextResponse.json(
      { error: "Superadmin access is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.secret || body.secret !== saSecret) {
    // Deliberate delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sa-token", saSecret, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
