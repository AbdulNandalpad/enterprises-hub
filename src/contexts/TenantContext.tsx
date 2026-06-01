"use client";

/**
 * TenantContext — provides the resolved tenant config throughout the app.
 *
 * On mount, fetches /api/tenant (which reads the eh-tenant cookie set by
 * middleware) and makes the full TenantConfig available via useTenant().
 *
 * Starts with a sensible default so the UI never flickers to a blank state.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { TenantConfig } from "@/lib/tenant/types";

// ─── Default (used before the fetch resolves) ─────────────────────────────────

const DEFAULT_TENANT: Omit<TenantConfig, "notes"> = {
  slug: "default",
  name: "EnterpriseHub",
  brandName: "Enterprise Hub",
  primaryColor: "#C8341A",
  domain: "enterprises-hub.de",
  plan: "pro",
  active: true,
  createdAt: "2026-01-01",
};

// ─── Context ──────────────────────────────────────────────────────────────────

const TenantContext = createContext<Omit<TenantConfig, "notes">>(DEFAULT_TENANT);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Omit<TenantConfig, "notes">>(DEFAULT_TENANT);

  useEffect(() => {
    // Try to read the slug from the cookie first (instant, no network)
    const cookieSlug = document.cookie
      .split("; ")
      .find((c) => c.startsWith("eh-tenant="))
      ?.split("=")[1];

    // Fetch the full config from the server (always authoritative)
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((config) => {
        if (config?.slug) setTenant(config);
      })
      .catch(() => {
        // If the fetch fails just keep using the default — never break the UI
      });

    // Suppress unused var warning — cookieSlug will be used for optimistic
    // pre-loading in a future iteration
    void cookieSlug;
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTenant() {
  return useContext(TenantContext);
}
