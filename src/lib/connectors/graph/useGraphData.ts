"use client";

/**
 * useGraphData — fetches user profile + today's calendar events in one shot.
 *
 * Used by dashboard widgets that need live Microsoft 365 data.
 * Data is fetched fresh on every page load — nothing is cached server-side.
 * Token acquisition uses MSAL silent flow (no popup unless consent is missing).
 */

import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { GRAPH_BASE_SCOPES, GRAPH_CALENDAR_SCOPES } from "./scopes";
import { getMe, getTodayEvents, type GraphUser, type GraphEvent } from "./client";

export interface GraphData {
  user: GraphUser | null;
  events: GraphEvent[];
  loading: boolean;
  error: string | null;
  /** true when the Calendars.Read scope token failed — so we can show a clearer message */
  calendarBlocked: boolean;
}

export function useGraphData(): GraphData {
  const { instance, accounts } = useMsal();
  const [state, setState] = useState<GraphData>({
    user: null,
    events: [],
    loading: true,
    error: null,
    calendarBlocked: false,
  });

  useEffect(() => {
    const account = accounts[0];
    if (!account) {
      setState({ user: null, events: [], loading: false, error: "Not signed in", calendarBlocked: false });
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        // Base token — User.Read, always available post-login
        const baseRes = await instance.acquireTokenSilent({
          scopes: [...GRAPH_BASE_SCOPES],
          account,
        });

        // Calendar token — try silently, skip if scope not consented
        let calToken: string | null = null;
        let calendarBlocked = false;
        try {
          const calRes = await instance.acquireTokenSilent({
            scopes: [...GRAPH_CALENDAR_SCOPES],
            account,
          });
          calToken = calRes.accessToken;
        } catch {
          // Calendars.Read not yet consented — flag it so the widget shows a clear message
          calendarBlocked = true;
        }

        const [user, events] = await Promise.all([
          getMe(baseRes.accessToken),
          calToken ? getTodayEvents(calToken) : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setState({ user, events, loading: false, error: null, calendarBlocked });
        }
      } catch (e) {
        if (!cancelled) {
          setState({ user: null, events: [], loading: false, error: (e as Error).message, calendarBlocked: false });
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [instance, accounts]);

  return state;
}
