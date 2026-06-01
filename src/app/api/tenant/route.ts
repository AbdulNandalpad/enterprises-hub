/**
 * GET /api/tenant
 *
 * Returns the full TenantConfig for the current request's tenant.
 * Reads the `eh-tenant` cookie (set by middleware) to get the slug,
 * then fetches the full config from Supabase (with static fallback).
 *
 * Never returns the `notes` field (internal only).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlugFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";

export async function GET(req: NextRequest) {
  const slug = req.cookies.get("eh-tenant")?.value ?? "default";

  let tenant: TenantConfig | null = null;

  // Primary: Supabase
  try {
    tenant = await getTenantBySlugFromDB(slug);
  } catch {
    // Supabase not configured — use static fallback
  }

  // Fallback: static registry
  if (!tenant) {
    tenant = getStaticTenantByDomain(
      slug === "default" ? "enterprises-hub.de" : `${slug}.enterprises-hub.de`
    );
  }

  // Strip internal-only fields
  const { notes: _notes, ...safe } = tenant;
  return NextResponse.json(safe);
}
