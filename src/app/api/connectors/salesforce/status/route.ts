/**
 * GET /api/connectors/salesforce/status?configId=<uuid>
 *
 * Returns { connected: true/false }
 * Checks: cookie (current machine) → Supabase connector_tokens (cross-device)
 * Client should send X-User-Email header so we can look up cross-device tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
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

export async function GET(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");
  if (!configId) return NextResponse.json({ connected: false });

  // 1. Check httpOnly cookies (current machine)
  const short   = configId.replace(/-/g, "").slice(0, 12);
  const jar     = await cookies();
  const token   = jar.get(`sf_token_${short}`)?.value;
  const refresh = jar.get(`sf_refresh_${short}`)?.value;

  if (token || refresh) return NextResponse.json({ connected: true, source: "cookie" });

  // 2. Fall back to Supabase cross-device token lookup
  const userEmail = req.headers.get("x-user-email")?.toLowerCase().trim();
  if (!userEmail) return NextResponse.json({ connected: false });

  try {
    const tenantSlug = await getTenantSlug(req);
    const { data } = await supabaseAdmin
      .from("connector_tokens")
      .select("id")
      .eq("tenant_slug", tenantSlug)
      .eq("user_email",  userEmail)
      .eq("config_id",   configId)
      .maybeSingle();

    return NextResponse.json({ connected: !!data, source: data ? "supabase" : "none" });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
