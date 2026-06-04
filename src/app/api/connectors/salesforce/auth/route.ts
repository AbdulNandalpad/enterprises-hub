/**
 * GET /api/connectors/salesforce/auth?configId=<uuid>&userEmail=<email>
 *
 * Redirects the browser to the Salesforce OAuth authorization page.
 * Encodes { configId, userEmail } as base64 JSON in the state param so the
 * callback can save the refresh token to Supabase keyed by user — this makes
 * tokens persist across devices (no longer lost when cookies clear).
 */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Sign a state payload so the callback can verify it wasn't tampered with. */
function signState(payload: string): string {
  const secret = process.env.SF_STATE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-only-insecure";
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export async function GET(req: NextRequest) {
  const configId  = req.nextUrl.searchParams.get("configId");
  const userEmail = req.nextUrl.searchParams.get("userEmail")?.toLowerCase().trim() ?? "";

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

  const origin      = req.nextUrl.origin;
  const redirectUri = `${origin}/api/connectors/salesforce/callback`;

  // Encode configId + userEmail in state and HMAC-sign it to prevent CSRF/tampering
  const statePayload = Buffer.from(JSON.stringify({ configId, userEmail })).toString("base64url");
  const signedState  = signState(statePayload);

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     config.client_id,
    redirect_uri:  redirectUri,
    scope:         "api refresh_token openid",
    state:         signedState,
  });

  const authUrl = `${config.instance_url}/services/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
