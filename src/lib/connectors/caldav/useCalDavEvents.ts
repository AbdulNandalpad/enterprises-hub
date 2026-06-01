"use client";

/**
 * useCalDavEvents — fetches today's events from the CalDAV API route,
 * or falls back to a locally-stored .ics file (uploaded via Settings).
 *
 * Priority:
 *  1. Server-configured iCal URL / CalDAV credentials (httpOnly cookie)
 *  2. Locally-uploaded .ics file stored in localStorage (eh_ical_data)
 *  3. Not configured → empty state
 */

import { useState, useEffect } from "react";
import type { CalDavEvent } from "./types";
import { loadIcsFromStorage, parseICalText } from "./parseIcal";

export interface CalDavState {
  events: CalDavEvent[];
  loading: boolean;
  configured: boolean;
  error: string | null;
  /** "server" = httpOnly cookie, "local" = localStorage ICS upload */
  source?: "server" | "local";
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
      // ── 1. Check server-side credential cookie ─────────────────────────────
      try {
        const configRes = await fetch("/api/connectors/caldav/config");
        const config = await configRes.json() as { configured: boolean };

        if (config.configured) {
          // Fetch today's events from the server
          try {
            const res = await fetch("/api/connectors/caldav/fetch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            const data = await res.json() as { events?: CalDavEvent[]; error?: string };
            if (!cancelled) {
              if (!res.ok) {
                setState({ events: [], loading: false, configured: true, error: data.error ?? "Fetch failed", source: "server" });
              } else {
                setState({ events: data.events ?? [], loading: false, configured: true, error: null, source: "server" });
              }
            }
          } catch (e) {
            if (!cancelled) setState({ events: [], loading: false, configured: true, error: (e as Error).message, source: "server" });
          }
          return;
        }
      } catch {
        // Network error checking config — fall through to localStorage check
      }

      // ── 2. Check localStorage for an uploaded .ics file ───────────────────
      const stored = loadIcsFromStorage();
      if (stored) {
        try {
          const events = parseICalText(stored.data, new Date());
          if (!cancelled) {
            setState({ events, loading: false, configured: true, error: null, source: "local" });
          }
          return;
        } catch {
          // Corrupt ICS data — treat as not configured
        }
      }

      // ── 3. Not configured ──────────────────────────────────────────────────
      if (!cancelled) setState({ events: [], loading: false, configured: false, error: null });
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
