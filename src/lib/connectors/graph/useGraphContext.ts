"use client";

/**
 * useGraphContext — React hook that provides a `buildContext()` function.
 *
 * Call `buildContext()` before sending an AI message to get live Microsoft 365
 * data (user profile + today's calendar) formatted as a context string.
 *
 * Strategy:
 *   1. Acquire User.Read token silently (should always succeed post-login)
 *   2. Try to acquire Calendars.Read via incremental consent (silent first,
 *      then interactive popup if needed — but only on user's first request)
 *   3. Fetch profile + events in parallel
 *   4. Return formatted context, or undefined if everything fails
 *
 * The hook never throws — all errors are caught so the AI call proceeds
 * even if Graph data is unavailable.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import {
  GRAPH_BASE_SCOPES,
  GRAPH_CALENDAR_SCOPES,
} from "./scopes";
import {
  getMe,
  getTodayEvents,
  formatGraphContext,
} from "./client";

export function useGraphContext() {
  const { instance, accounts } = useMsal();

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    const account = accounts[0];
    if (!account) return undefined;

    try {
      // ── Base token (User.Read) — always available post-login ──────────────
      const baseRes = await instance.acquireTokenSilent({
        scopes:  [...GRAPH_BASE_SCOPES],
        account,
      });

      // ── Calendar token — try silent, then interactive popup ───────────────
      let calToken: string | null = null;
      try {
        const calRes = await instance.acquireTokenSilent({
          scopes:  [...GRAPH_CALENDAR_SCOPES],
          account,
        });
        calToken = calRes.accessToken;
      } catch {
        // Scope not pre-consented — skip calendar without prompting
        // (To enable, add "Calendars.Read" to loginRequest.scopes in msal.ts)
      }

      // ── Fetch data in parallel ────────────────────────────────���────────────
      const [user, events] = await Promise.all([
        getMe(baseRes.accessToken),
        calToken ? getTodayEvents(calToken) : Promise.resolve([]),
      ]);

      return formatGraphContext(user, events);
    } catch {
      // Silent auth failed entirely (e.g., token expired, no network)
      return undefined;
    }
  }, [instance, accounts]);

  return { buildContext };
}
