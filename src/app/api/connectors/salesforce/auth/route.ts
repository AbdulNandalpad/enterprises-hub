/**
 * GET /api/connectors/salesforce/auth?configId=<uuid>
 *
 * Looks up the connector config from DB, then redirects the browser
 * to that org's Salesforce OAuth authorization page.
 * Redirect URI is derived from the incoming request — no env vars needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");

  if (!configId) {
    return NextResponse.json({ error: "configId required" }, { status: 400 });
  }

  const { data: config, error } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id")
    .eq("id", configId)
    .eq("connector_type", "salesforce")
    .single();

  if (error || !config) {
    return NextResponse.json({ error: "Connector config not found" }, { status: 404 });
  }

  // Derive redirect URI from current request — works on any domain automatically
  const origin      = req.nextUrl.origin;
  const redirectUri = `${origin}/api/connectors/salesforce/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     config.client_id,
    redirect_uri:  redirectUri,
    scope:         "api refresh_token openid",
    state:         configId, // pass configId via state param — more reliable than query param
  });

  const authUrl = `${config.instance_url}/services/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
