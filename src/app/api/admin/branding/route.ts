/**
 * PATCH /api/admin/branding
 *
 * Updates the current tenant's branding fields in the tenants table.
 * Allowed fields: name, brand_name, primary_color, logo_url, domain
 *
 * Tenant is resolved from the Host header (canonical).
 * Same-origin guard — only callable from the admin UI.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api-security";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

export async function PATCH(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const tenantSlug = await getTenantSlug(req);

  // Only allow explicit branding fields — never let the client overwrite slug/plan/active
  const allowed: Record<string, string> = {
    name:          "name",
    brandName:     "brand_name",
    primaryColor:  "primary_color",
    logoUrl:       "logo_url",
    domain:        "domain",
  };

  const patch: Record<string, unknown> = {};
  for (const [clientKey, dbCol] of Object.entries(allowed)) {
    if (body[clientKey] !== undefined) {
      patch[dbCol] = body[clientKey] === "" ? null : body[clientKey];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(patch)
    .eq("slug", tenantSlug)
    .select("slug, name, brand_name, primary_color, logo_url, domain, plan, active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return in the same shape as /api/tenant so the client can update TenantContext directly
  return NextResponse.json({
    slug:         data.slug,
    name:         data.name,
    brandName:    data.brand_name,
    primaryColor: data.primary_color,
    logoUrl:      data.logo_url ?? undefined,
    domain:       data.domain,
    plan:         data.plan,
    active:       data.active,
  });
}
