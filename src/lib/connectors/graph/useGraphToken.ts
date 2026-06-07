"use client";

/**
 * useGraphToken — returns a function that silently acquires a Microsoft Graph
 * access token from MSAL.
 *
 * Used by the AI agent panel to forward the token to /api/ai/agent so the
 * server-side orchestration layer can call Graph directly.
 *
 * Returns null (never throws) when the user is not signed in or the token
 * cannot be acquired silently — the agent degrades gracefully without it.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { GRAPH_BASE_SCOPES } from "./scopes";

export function useGraphToken() {
  const { instance, accounts } = useMsal();

  const getToken = useCallback(async (): Promise<string | null> => {
    const account = accounts[0];
    if (!account) return null;

    try {
      const res = await instance.acquireTokenSilent({
        scopes: [...GRAPH_BASE_SCOPES],
        account,
      });
      return res.accessToken;
    } catch {
      return null;
    }
  }, [instance, accounts]);

  return { getToken };
}
