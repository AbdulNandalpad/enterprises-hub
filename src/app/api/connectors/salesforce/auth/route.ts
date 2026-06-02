/**
 * GET /api/connectors/salesforce/auth?configId=<uuid>
 *
 * Looks up the connector config from DB, then redirects the browser
 * to that org's Salesforce OAuth authorization page.
 * The client_secret never leaves the server.
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

  const redirectUri = `${process.env.SF_REDIRECT_URI ?? ""}?configId=${configId}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     config.client_id,
    redirect_uri:  redirectUri,
    scope:         "api refresh_token openid",
  });

  const authUrl = `${config.instance_url}/services/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
