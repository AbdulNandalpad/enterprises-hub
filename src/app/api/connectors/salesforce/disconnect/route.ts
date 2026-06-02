/**
 * POST /api/connectors/salesforce/disconnect?configId=<uuid>
 * Clears the token cookies for this specific org.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");
  if (!configId) return NextResponse.json({ error: "configId required" }, { status: 400 });

  const short = configId.replace(/-/g, "").slice(0, 12);
  const clear = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 0 };

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`sf_token_${short}`,   "", clear);
  res.cookies.set(`sf_inst_${short}`,    "", clear);
  res.cookies.set(`sf_refresh_${short}`, "", clear);
  return res;
}
