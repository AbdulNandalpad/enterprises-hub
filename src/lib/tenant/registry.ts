/**
 * Tenant registry — static list of all provisioned clients.
 *
 * To add a new tenant:
 *   1. Add an entry to TENANTS below
 *   2. Ask the client to CNAME their domain to enterprises-hub.vercel.app
 *      (or use the auto-subdomain servicesphere.enterprises-hub.de — no DNS needed)
 *   3. Add their domain to Vercel → Project → Domains
 *   4. Deploy
 *
 * TODO: migrate to Supabase `tenants` table for self-serve provisioning.
 */

import type { TenantConfig } from "./types";

export const TENANTS: TenantConfig[] = [
  // ─── EnterpriseHub default (your own product) ────────────────────────────────
  {
    slug: "default",
    name: "EnterpriseHub",
    brandName: "Enterprise Hub",
    primaryColor: "#C8341A",
    domain: "enterprises-hub.de",
    plan: "pro",
    active: true,
    createdAt: "2026-01-01",
    notes: "Default tenant — the EnterpriseHub product itself.",
  },

  // ─── Servicesphere ───────────────────────────────────────────────────────────
  {
    slug: "servicesphere",
    name: "Servicesphere GmbH",
    brandName: "Servicesphere Hub",
    primaryColor: "#C8341A",
    domain: "hub.servicesphere.de",
    // azureTenantId: "fill-in-when-ready",
    plan: "trial",
    active: true,
    createdAt: "2026-06-01",
    notes: "First pilot customer. IONOS Mail + Teams connected.",
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** Resolve tenant from the incoming hostname.
 *  Falls back to the default tenant if no match found. */
export function getTenantByDomain(hostname: string): TenantConfig {
  // Strip port (localhost:3000 → localhost)
  const host = hostname.replace(/:\d+$/, "").toLowerCase();

  // 1. Exact domain match
  const exact = TENANTS.find((t) => t.active && t.domain === host);
  if (exact) return exact;

  // 2. Auto-subdomain: <slug>.enterprises-hub.de
  const subMatch = host.match(/^([a-z0-9-]+)\.enterprises-hub\.de$/);
  if (subMatch) {
    const bySlug = TENANTS.find((t) => t.active && t.slug === subMatch[1]);
    if (bySlug) return bySlug;
  }

  // 3. localhost / Vercel preview — return default
  return TENANTS.find((t) => t.slug === "default")!;
}

/** Look up by slug — used by the /api/tenant route and superadmin panel. */
export function getTenantBySlug(slug: string): TenantConfig | undefined {
  return TENANTS.find((t) => t.slug === slug);
}

/** All tenants — used by the superadmin panel. */
export function getAllTenants(): TenantConfig[] {
  return TENANTS;
}
