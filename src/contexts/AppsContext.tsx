"use client";

/**
 * AppsContext — controls which apps are visible in the sidebar.
 *
 * Persists to localStorage (key "eh-enabled-apps").
 * Default: only the first 3 apps enabled (Servicesphere, IONOS Mail, Teams).
 * Users toggle apps on/off in Settings → Apps.
 *
 * No business data stored — only a list of enabled app IDs.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apps as ALL_APPS, type App } from "@/lib/apps";

const STORAGE_KEY = "eh-enabled-apps";

// Default: first 3 apps (Servicesphere, IONOS Mail, Teams)
const DEFAULT_ENABLED = new Set(ALL_APPS.slice(0, 3).map((a) => a.id));

function load(): Set<string> {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENABLED;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ENABLED;
    return new Set(parsed as string[]);
  } catch {
    return DEFAULT_ENABLED;
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
  const [enabledIds, setEnabledIds] = useState<Set<string>>(load);

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
