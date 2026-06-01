/**
 * GET /api/user/me?email=<email>
 *
 * Returns the current user's profile and roles from tenant_users.
 * Tenant is resolved from the Host header (canonical).
 * Same-origin guard prevents cross-origin lookups.
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

export async function GET(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  const tenantSlug = await getTenantSlug(req);

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("id, email, name, roles, status")
    .eq("tenant_slug", tenantSlug)
    .eq("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // User not yet in tenant_users — return empty roles (they exist via Azure AD but
  // haven't been onboarded to this tenant's role registry yet)
  if (!data) {
    return NextResponse.json({ email, roles: [], status: "unknown" });
  }

  return NextResponse.json({
    id:     data.id,
    email:  data.email,
    name:   data.name,
    roles:  data.roles ?? [],
    status: data.status,
  });
}
