"use client";

/**
 * AppsContext — controls which apps are visible in the sidebar.
 *
 * Persists to localStorage (key "eh-enabled-apps").
 *
 * Seeding priority:
 *  1. If localStorage has a saved list → use it (user's personal preference)
 *  2. If not (first visit) + tenant has defaultApps set → use tenant defaults
 *  3. Fallback: first 3 apps (Servicesphere, IONOS Mail, Teams)
 *
 * Users toggle apps on/off in Settings → Apps.
 * Admins set the tenant default in Settings → Branding → Apps.
 *
 * No business data stored — only a list of enabled app IDs.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apps as ALL_APPS, type App } from "@/lib/apps";
import { useTenant } from "@/contexts/TenantContext";

const STORAGE_KEY = "eh-enabled-apps";

// System fallback: first 3 apps (Servicesphere, IONOS Mail, Teams)
const SYSTEM_DEFAULT_IDS = ALL_APPS.slice(0, 3).map((a) => a.id);

function loadFromStorage(): Set<string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;  // not yet set — caller will seed from tenant defaults
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(parsed as string[]);
  } catch {
    return null;
  }
}

function persist(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface AppsContextValue {
  /** Apps currently enabled — shown in the sidebar */
  enabledApps: App[];
  /** All available apps — used in the settings toggle list */
  allApps: App[];
  /** Whether a specific app ID is enabled */
  isEnabled: (id: string) => boolean;
  /** Toggle an app on or off */
  toggle: (id: string) => void;
}

const AppsContext = createContext<AppsContextValue>({
  enabledApps: ALL_APPS.slice(0, 3),
  allApps: ALL_APPS,
  isEnabled: () => true,
  toggle: () => {},
});

export function AppsProvider({ children }: { children: ReactNode }) {
  const tenant = useTenant();

  // Initialise from localStorage immediately; if missing, use system fallback
  // until we know the tenant defaults (resolved in the effect below)
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => {
    const stored = loadFromStorage();
    return stored ?? new Set(SYSTEM_DEFAULT_IDS);
  });

  // Once tenant loads: if the user has never saved a preference yet,
  // seed from the tenant's configured defaultApps
  useEffect(() => {
    if (tenant.slug === "default") return;          // tenant not yet resolved
    const stored = loadFromStorage();
    if (stored !== null) return;                    // user already has a preference
    const seeds = tenant.defaultApps ?? SYSTEM_DEFAULT_IDS;
    const next = new Set(seeds);
    setEnabledIds(next);
    persist(next);
  }, [tenant.slug, tenant.defaultApps]);

  const toggle = useCallback((id: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const isEnabled = useCallback(
    (id: string) => enabledIds.has(id),
    [enabledIds]
  );

  const enabledApps = ALL_APPS.filter((a) => enabledIds.has(a.id));

  return (
    <AppsContext.Provider
      value={{ enabledApps, allApps: ALL_APPS, isEnabled, toggle }}
    >
      {children}
    </AppsContext.Provider>
  );
}

export function useApps() {
  return useContext(AppsContext);
}
