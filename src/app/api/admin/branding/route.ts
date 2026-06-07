/**
 * PATCH /api/admin/branding
 *
 * Updates the current tenant's branding fields in the tenants table.
 * Allowed fields: name, brand_name, primary_color, logo_url
 *
 * Note: `domain` is intentionally NOT in the allowed set. Changing a tenant's
 * domain affects DNS routing and must only be done by a superadmin.  Allowing
 * a tenant admin to change their own domain could be used to hijack routing.
 *
 * Tenant is resolved from the Host header (canonical).
 * Protected by assertAdmin — rejects demo sessions and requires same-origin.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
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
  const adminErr = assertAdmin(req);
  if (adminErr) return adminErr;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const tenantSlug = await getTenantSlug(req);

  // Only allow explicit branding fields — never let the client overwrite
  // slug / plan / active / domain.  Domain changes must go through superadmin.
  const allowedScalar: Record<string, string> = {
    name:         "name",
    brandName:    "brand_name",
    primaryColor: "primary_color",
    logoUrl:      "logo_url",
  };

  const patch: Record<string, unknown> = {};
  for (const [clientKey, dbCol] of Object.entries(allowedScalar)) {
    if (body[clientKey] !== undefined) {
      patch[dbCol] = body[clientKey] === "" ? null : body[clientKey];
    }
  }

  // defaultApps — JSON array of enabled app IDs, or null to reset to system default
  if (body.defaultApps !== undefined) {
    patch.default_apps = Array.isArray(body.defaultApps) ? body.defaultApps : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(patch)
    .eq("slug", tenantSlug)
    .select("slug, name, brand_name, primary_color, logo_url, domain, plan, active, default_apps")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return in the same shape as /api/tenant so the client can update TenantContext directly
  return NextResponse.json({
    slug:         data.slug,
    name:         data.name,
    brandName:    data.brand_name,
    primaryColor: data.primary_color,
    logoUrl:      data.logo_url       ?? undefined,
    domain:       data.domain,
    plan:         data.plan,
    active:       data.active,
    defaultApps:  data.default_apps   ?? undefined,
  });
}
