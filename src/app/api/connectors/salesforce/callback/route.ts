/**
 * GET /api/connectors/salesforce/callback?code=...&state=<encoded>
 *
 * Exchanges the authorization code for tokens, then:
 *   1. Stores tokens in httpOnly cookies (current machine)
 *   2. Saves the refresh token to Supabase connector_tokens (cross-device)
 *
 * State param is base64url-encoded JSON: { configId, userEmail }
 * Falls back to treating state as a plain configId (legacy).
 *
 * SQL (run once):
 *   CREATE TABLE IF NOT EXISTS connector_tokens (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     tenant_slug   text NOT NULL,
 *     user_email    text NOT NULL,
 *     config_id     uuid NOT NULL,
 *     refresh_token text NOT NULL,
 *     instance_url  text,
 *     created_at    timestamptz DEFAULT now(),
 *     updated_at    timestamptz DEFAULT now(),
 *     UNIQUE (tenant_slug, user_email, config_id)
 *   );
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

export const runtime = "nodejs";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

/** Decode state param — new format is base64url JSON, legacy is plain configId UUID */
function decodeState(state: string): { configId: string; userEmail: string } {
  // Try base64url JSON first
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (decoded.configId) {
      return { configId: decoded.configId, userEmail: decoded.userEmail ?? "" };
    }
  } catch { /* fall through */ }

  // Legacy: state is plain configId UUID
  return { configId: state, userEmail: "" };
}

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?sf_error=missing_params", req.url));
  }

  const { configId, userEmail } = decodeState(state);

  // Load connector config from DB
  const { data: config, error: configErr } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret, tenant_slug")
    .eq("id", configId)
    .eq("connector_type", "salesforce")
    .single();

  if (configErr || !config) {
    return NextResponse.redirect(new URL("/dashboard?sf_error=config_not_found", req.url));
  }

  try {
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

    // 1. Store tokens in httpOnly cookies (current browser / machine)
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

    // 2. Persist refresh token to Supabase for cross-device access
    if (userEmail) {
      const tenantSlug = config.tenant_slug ?? (await getTenantSlug(req));
      await supabaseAdmin
        .from("connector_tokens")
        .upsert(
          {
            tenant_slug:   tenantSlug,
            user_email:    userEmail,
            config_id:     configId,
            refresh_token: tokens.refresh_token,
            instance_url:  tokens.instance_url,
            updated_at:    new Date().toISOString(),
          },
          { onConflict: "tenant_slug,user_email,config_id" }
        )
        .select()
        .maybeSingle();
      // Non-critical — if this fails the cookies still work on this machine
    }

    return redirect;
  } catch (err) {
    console.error("[SF callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/dashboard?sf_error=unknown", req.url));
  }
}
