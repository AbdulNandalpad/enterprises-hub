/**
 * Tenant registry — static fallback only.
 *
 * The live source of truth is the Supabase `tenants` table.
 * This file is used ONLY in two situations:
 *   1. Edge Middleware — can't run Node.js, uses Supabase REST API directly.
 *      If the REST call fails (timeout / missing env), falls back to these entries.
 *   2. Local dev without Supabase — keeps the app working without env vars.
 *
 * For everything else (API routes, superadmin panel) use src/lib/tenant/db.ts.
 */

import type { TenantConfig } from "./types";

export const STATIC_TENANTS: TenantConfig[] = [
  {
    slug: "default",
    name: "EnterpriseHub",
    brandName: "Enterprise Hub",
    primaryColor: "#C8341A",
    domain: "enterprises-hub.de",
    plan: "pro",
    active: true,
    createdAt: "2026-01-01",
  },
  {
    slug: "servicesphere",
    name: "Servicesphere GmbH",
    brandName: "Servicesphere Hub",
    primaryColor: "#C8341A",
    domain: "hub.servicesphere.de",
    plan: "trial",
    active: true,
    createdAt: "2026-06-01",
  },
];

/** Used by middleware as a fallback when Supabase is unavailable. */
export function getStaticTenantByDomain(hostname: string): TenantConfig {
  const host = hostname.replace(/:\d+$/, "").toLowerCase();

  const exact = STATIC_TENANTS.find((t) => t.active && t.domain === host);
  if (exact) return exact;

  const subMatch = host.match(/^([a-z0-9-]+)\.enterprises-hub\.de$/);
  if (subMatch) {
    const bySlug = STATIC_TENANTS.find((t) => t.active && t.slug === subMatch[1]);
    if (bySlug) return bySlug;
  }

  return STATIC_TENANTS.find((t) => t.slug === "default")!;
}

/** @deprecated Use getAllTenantsFromDB() from src/lib/tenant/db.ts instead. */
export const TENANTS = STATIC_TENANTS;
/** @deprecated Use getTenantBySlugFromDB() from src/lib/tenant/db.ts instead. */
export function getTenantBySlug(slug: string) {
  return STATIC_TENANTS.find((t) => t.slug === slug);
}
/** @deprecated Use getAllTenantsFromDB() from src/lib/tenant/db.ts instead. */
export function getAllTenants() {
  return STATIC_TENANTS;
}
