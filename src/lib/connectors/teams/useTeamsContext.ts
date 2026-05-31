"use client";

/**
 * useTeamsContext — React hook providing a `buildContext()` function.
 *
 * Respects the "eh-teams-enabled" localStorage flag set by ConnectorsSettings.
 * If the user has not explicitly granted access (or has disconnected), this
 * returns undefined immediately without attempting any token acquisition.
 *
 * Never throws — if Teams data is unavailable the AI call proceeds without it.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { TEAMS_SCOPES } from "./scopes";
import { getMyTeams, getRecentChats, formatTeamsContext } from "./client";

/** Must match the key used in ConnectorsSettings */
const TEAMS_ENABLED_KEY = "eh-teams-enabled";

export function useTeamsContext() {
  const { instance, accounts } = useMsal();

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    // Respect the user's explicit opt-in — don't silently try scopes they haven't granted
    if (typeof window !== "undefined" && localStorage.getItem(TEAMS_ENABLED_KEY) !== "true") {
      return undefined;
    }

    const account = accounts[0];
    if (!account) return undefined;

    try {
      const res = await instance.acquireTokenSilent({
        scopes: [...TEAMS_SCOPES],
        account,
      });

      const [teams, chats] = await Promise.all([
        getMyTeams(res.accessToken),
        getRecentChats(res.accessToken),
      ]);

      return formatTeamsContext(teams, chats);
    } catch {
      // Token expired or consent revoked — don't prompt, just skip context
      return undefined;
    }
  }, [instance, accounts]);

  return { buildContext };
}
