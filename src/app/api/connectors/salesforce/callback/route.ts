/**
 * GET /api/connectors/salesforce/callback?code=...&state=<configId>
 *
 * Exchanges the Salesforce authorization code for an access token
 * using credentials looked up from DB by configId (passed via OAuth state param).
 * Stores tokens in httpOnly cookies keyed by configId.
 * No env vars needed — redirect URI derived from request origin.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code     = req.nextUrl.searchParams.get("code");
  const configId = req.nextUrl.searchParams.get("state"); // passed via OAuth state param

  if (!code || !configId) {
    return NextResponse.redirect(new URL("/dashboard?sf_error=missing_params", req.url));
  }

  // Load connector config from DB
  const { data: config, error: configErr } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret")
    .eq("id", configId)
    .eq("connector_type", "salesforce")
    .single();

  if (configErr || !config) {
    return NextResponse.redirect(new URL("/dashboard?sf_error=config_not_found", req.url));
  }

  try {
    // Derive redirect URI from request — must match what was sent in /auth
    const origin      = req.nextUrl.origin;
    const redirectUri = `${origin}/api/connectors/salesforce/callback`;

    const body = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     config.client_id,
      client_secret: config.client_secret,
      redirect_uri:  redirectUri,
      code,
    });

    const tokenRes = await fetch(`${config.instance_url}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[SF callback] token exchange failed:", text);
      return NextResponse.redirect(new URL("/dashboard?sf_error=token_exchange", req.url));
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      instance_url: string;
    };

    const redirect = NextResponse.redirect(
      new URL(`/dashboard?sf_connected=${configId}`, req.url)
    );

    const short      = configId.replace(/-/g, "").slice(0, 12);
    const cookieOpts = {
      httpOnly: true, secure: true, sameSite: "lax" as const,
      path: "/", maxAge: 60 * 60 * 8,
    };

    redirect.cookies.set(`sf_token_${short}`,   tokens.access_token,  cookieOpts);
    redirect.cookies.set(`sf_inst_${short}`,    tokens.instance_url,  cookieOpts);
    redirect.cookies.set(`sf_refresh_${short}`, tokens.refresh_token, {
      ...cookieOpts, maxAge: 60 * 60 * 24 * 30,
    });

    return redirect;
  } catch (err) {
    console.error("[SF callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/dashboard?sf_error=unknown", req.url));
  }
}
