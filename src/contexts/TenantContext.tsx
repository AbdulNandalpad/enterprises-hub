"use client";

/**
 * TenantContext — provides the resolved tenant config throughout the app.
 *
 * On mount, fetches /api/tenant (which reads the eh-tenant cookie set by
 * middleware) and makes the full TenantConfig available via useTenant().
 *
 * Also exposes:
 *   refreshTenant() — re-fetches from the API (call after branding save)
 *   updateTenant()  — optimistic local update (instant, no round-trip)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { TenantConfig } from "@/lib/tenant/types";

// ─── Default (used before the fetch resolves) ─────────────────────────────────

const DEFAULT_TENANT: Omit<TenantConfig, "notes"> = {
  slug:         "default",
  name:         "EnterpriseHub",
  brandName:    "Enterprise Hub",
  primaryColor: "#C8341A",
  domain:       "enterprises-hub.de",
  plan:         "pro",
  active:       true,
  createdAt:    "2026-01-01",
};

// ─── Context shape ────────────────────────────────────────────────────────────

interface TenantCtx {
  tenant:        Omit<TenantConfig, "notes">;
  refreshTenant: () => Promise<void>;
  updateTenant:  (patch: Partial<Omit<TenantConfig, "notes">>) => void;
}

const TenantContext = createContext<TenantCtx>({
  tenant:        DEFAULT_TENANT,
  refreshTenant: async () => {},
  updateTenant:  () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Omit<TenantConfig, "notes">>(DEFAULT_TENANT);

  const fetchTenant = useCallback(async () => {
    try {
      const res    = await fetch("/api/tenant");
      const config = await res.json();
      if (config?.slug) setTenant(config);
    } catch {
      // keep current value on failure
    }
  }, []);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const refreshTenant = useCallback(() => fetchTenant(), [fetchTenant]);

  const updateTenant = useCallback((patch: Partial<Omit<TenantConfig, "notes">>) => {
    setTenant((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, refreshTenant, updateTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Returns the full tenant context including refresh/update helpers. */
export function useTenantCtx() {
  return useContext(TenantContext);
}

/** Convenience hook — returns just the tenant config (backwards-compatible). */
export function useTenant() {
  return useContext(TenantContext).tenant;
}
