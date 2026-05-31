"use client";

/**
 * useTeamsContext — React hook that provides a `buildContext()` function.
 *
 * Acquires Teams scopes via incremental consent (silent first, then popup).
 * Never throws — if Teams data is unavailable the AI call proceeds without it.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { TEAMS_SCOPES } from "./scopes";
import { getMyTeams, getRecentChats, formatTeamsContext } from "./client";

export function useTeamsContext() {
  const { instance, accounts } = useMsal();

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    const account = accounts[0];
    if (!account) return undefined;

    try {
      // Try silent first — works if user already consented to Teams scopes
      let teamsToken: string;
      try {
        const res = await instance.acquireTokenSilent({
          scopes: [...TEAMS_SCOPES],
          account,
        });
        teamsToken = res.accessToken;
      } catch {
        // Scopes not yet consented — skip Teams context silently.
        // The Settings > Connectors page prompts the user to grant access.
        return undefined;
      }

      const [teams, chats] = await Promise.all([
        getMyTeams(teamsToken),
        getRecentChats(teamsToken),
      ]);

      return formatTeamsContext(teams, chats);
    } catch {
      return undefined;
    }
  }, [instance, accounts]);

  return { buildContext };
}
