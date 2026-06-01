"use client";

/**
 * useCalDavEvents — fetches today's events from the CalDAV API route.
 *
 * Returns an empty array if CalDAV is not configured (no cookie).
 * Errors are swallowed — the widget shows "not configured" state instead.
 */

import { useState, useEffect } from "react";
import type { CalDavEvent } from "./types";

export interface CalDavState {
  events: CalDavEvent[];
  loading: boolean;
  configured: boolean;
  error: string | null;
}

export function useCalDavEvents(): CalDavState {
  const [state, setState] = useState<CalDavState>({
    events: [],
    loading: true,
    configured: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // First check if CalDAV is configured at all
      try {
        const configRes = await fetch("/api/connectors/caldav/config");
        const config = await configRes.json() as { configured: boolean };
        if (!config.configured) {
          if (!cancelled) setState({ events: [], loading: false, configured: false, error: null });
          return;
        }
      } catch {
        if (!cancelled) setState({ events: [], loading: false, configured: false, error: null });
        return;
      }

      // Fetch today's events
      try {
        const res = await fetch("/api/connectors/caldav/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json() as { events?: CalDavEvent[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setState({ events: [], loading: false, configured: true, error: data.error ?? "Fetch failed" });
        } else {
          if (!cancelled) setState({ events: data.events ?? [], loading: false, configured: true, error: null });
        }
      } catch (e) {
        if (!cancelled) setState({ events: [], loading: false, configured: true, error: (e as Error).message });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
