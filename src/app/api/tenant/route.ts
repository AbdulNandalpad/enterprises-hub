/**
 * GET /api/tenant
 *
 * Returns the full TenantConfig for the current request's tenant.
 *
 * Resolution order (CRIT-3 fix — tenant resolved from Host header, not cookie):
 *   1. Host header → Supabase domain lookup (authoritative, cannot be spoofed)
 *   2. Host header → static registry fallback
 *   3. eh-tenant cookie → slug lookup (dev/proxy fallback only)
 *
 * The eh-tenant cookie is JS-readable (non-httpOnly) so we do NOT trust it
 * as the primary tenant source — the Host header is canonical.
 *
 * Never returns the `notes` field (internal only).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getTenantByDomainFromDB, getTenantBySlugFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";

export async function GET(req: NextRequest) {
  // Primary: resolve from Host header — authoritative, user cannot spoof this
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";

  let tenant: TenantConfig | null = null;

  // Try Supabase by domain (Host header)
  try {
    if (host) tenant = await getTenantByDomainFromDB(host);
  } catch { /* Supabase not configured */ }

  // Static fallback by domain
  if (!tenant && host) {
    const staticT = getStaticTenantByDomain(host);
    if (staticT.slug !== "default" || host === "localhost" || host.includes("enterprises-hub")) {
      tenant = staticT;
    }
  }

  // Last resort: use eh-tenant cookie slug (dev / reverse-proxy environments)
  if (!tenant) {
    const slug = req.cookies.get("eh-tenant")?.value ?? "default";
    try {
      tenant = await getTenantBySlugFromDB(slug);
    } catch { /* fallback */ }
    if (!tenant) tenant = getStaticTenantByDomain(host || "enterprises-hub.de");
  }

  // Strip internal-only fields
  const { notes: _notes, ...safe } = tenant;
  return NextResponse.json(safe);
}
