/**
 * GET /api/connectors/salesforce/status?configId=<uuid>
 * Returns { connected: true/false }
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");
  if (!configId) return NextResponse.json({ connected: false });

  const short   = configId.replace(/-/g, "").slice(0, 12);
  const jar     = await cookies();
  const token   = jar.get(`sf_token_${short}`)?.value;
  const refresh = jar.get(`sf_refresh_${short}`)?.value;

  return NextResponse.json({ connected: !!token || !!refresh });
}
