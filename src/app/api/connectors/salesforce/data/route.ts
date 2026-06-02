/**
 * GET /api/connectors/salesforce/data?configId=<uuid>&type=opportunities|contacts|stats
 *
 * Server-side proxy — reads the httpOnly token cookie for this configId,
 * calls Salesforce, returns typed JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOpportunities, getContacts, getDashboardStats } from "@/lib/connectors/salesforce/client";

export const runtime = "nodejs";

async function refreshToken(
  configId: string,
  short: string
): Promise<{ access_token: string; instance_url: string } | null> {
  const jar     = await cookies();
  const refresh = jar.get(`sf_refresh_${short}`)?.value;
  if (!refresh) return null;

  const { data: config } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret")
    .eq("id", configId)
    .single();

  if (!config) return null;

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     config.client_id,
    client_secret: config.client_secret,
    refresh_token: refresh,
  });

  const res = await fetch(`${config.instance_url}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string; instance_url: string }>;
}

export async function GET(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");
  const type     = req.nextUrl.searchParams.get("type") ?? "opportunities";

  if (!configId) return NextResponse.json({ error: "configId required" }, { status: 400 });

  const short = configId.replace(/-/g, "").slice(0, 12);
  const jar   = await cookies();

  let token       = jar.get(`sf_token_${short}`)?.value;
  let instanceUrl = jar.get(`sf_inst_${short}`)?.value;

  if (!token || !instanceUrl) {
    const refreshed = await refreshToken(configId, short);
    if (refreshed) {
      token       = refreshed.access_token;
      instanceUrl = refreshed.instance_url;
    } else {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
  }

  try {
    let data: unknown;
    switch (type) {
      case "opportunities": data = await getOpportunities(instanceUrl, token); break;
      case "contacts":      data = await getContacts(instanceUrl, token);      break;
      case "stats":         data = await getDashboardStats(instanceUrl, token); break;
      default: return NextResponse.json({ error: "unknown_type" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("401")) {
      const refreshed = await refreshToken(configId, short);
      if (refreshed) {
        let retryData: unknown;
        switch (type) {
          case "opportunities": retryData = await getOpportunities(refreshed.instance_url, refreshed.access_token); break;
          case "contacts":      retryData = await getContacts(refreshed.instance_url, refreshed.access_token);      break;
          case "stats":         retryData = await getDashboardStats(refreshed.instance_url, refreshed.access_token); break;
        }
        const res = NextResponse.json(retryData);
        const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 8 };
        res.cookies.set(`sf_token_${short}`, refreshed.access_token, opts);
        res.cookies.set(`sf_inst_${short}`,  refreshed.instance_url,  opts);
        return res;
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
