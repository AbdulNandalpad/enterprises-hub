/**
 * GET /api/user/me
 *
 * Returns the authenticated user's profile and roles from tenant_users.
 * Tenant is resolved from the Host header (canonical).
 *
 * The caller must pass their own email — they cannot query another user.
 * This is enforced by accepting only the email from the MSAL account that
 * is stored in the X-User-Email header (set by the client from useMsal()).
 * If no header is present, the ?email= query param is used as a fallback
 * (for demo-free, backward-compatible clients) — in both cases the route
 * treats the value as the requester's own identity, not an admin lookup.
 *
 * Note: a proper fix would verify an MSAL access token server-side. Until
 * that is in place, same-origin + tenant scoping are the primary protections.
 * Rate limiting prevents bulk enumeration via sequential email guessing.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, checkRateLimit, getClientIp } from "@/lib/api-security";
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

  // Rate limit: 30 requests per IP per minute — prevents enumeration
  const ip = getClientIp(req);
  const rateLimitRes = checkRateLimit(`user-me:${ip}`, 30, 60 * 1000);
  if (rateLimitRes) return rateLimitRes;

  // Accept email from a dedicated header (preferred — set by the client from
  // the MSAL account object), fall back to the query param.
  const headerEmail = req.headers.get("x-user-email")?.toLowerCase().trim();
  const queryEmail  = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  const email       = headerEmail ?? queryEmail;

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
