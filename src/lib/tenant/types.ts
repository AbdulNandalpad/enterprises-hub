/**
 * Tenant configuration — one record per client company.
 *
 * Stored in registry.ts (static) for now.
 * Migrate to Supabase `tenants` table when ready for self-serve provisioning.
 */

export interface TenantConfig {
  /** URL-safe identifier — used in cookie, subdomain fallback, etc. */
  slug: string;

  /** Legal company name — e.g. "Servicesphere GmbH" */
  name: string;

  /** Display name shown in the hub UI — e.g. "Servicesphere Hub" */
  brandName: string;

  /** Primary brand colour (hex) — used for accents, logo square */
  primaryColor: string;

  /** Secondary / accent colour — defaults to primaryColor if omitted */
  accentColor?: string;

  /**
   * Canonical hostname for this tenant.
   * Can be a custom domain (hub.servicesphere.de) or an EH subdomain
   * (servicesphere.enterprises-hub.de).
   */
  domain: string;

  /**
   * Azure AD tenant ID — if set, the login page locks to this tenant
   * so only that company's users can sign in.
   * Leave undefined to accept any Microsoft work account (multi-tenant).
   */
  azureTenantId?: string;

  /** Subscription plan */
  plan: "trial" | "starter" | "pro";

  /** Inactive tenants are rejected at the middleware layer */
  active: boolean;

  /** ISO date string — for the superadmin "since" column */
  createdAt: string;

  /** Short note visible only in the superadmin panel */
  notes?: string;
}
