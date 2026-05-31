/**
 * Microsoft Teams Graph API helpers.
 * Teams data is available through the same Graph endpoint — no separate SDK needed.
 *
 * Both endpoints use delegated permissions the user can consent to themselves
 * (no Azure AD admin approval required).
 */

import { GRAPH_BASE_URL } from "../graph/scopes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamsTeam {
  id: string;
  displayName: string;
  description: string | null;
}

export interface TeamsChat {
  id: string;
  chatType: "oneOnOne" | "group" | "meeting" | "unknownFutureValue";
  topic: string | null;
  lastUpdatedDateTime: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function graphFetch<T>(
  token: string,
  path: string,
  params?: URLSearchParams
): Promise<T | null> {
  const url = `${GRAPH_BASE_URL}${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** /me/joinedTeams — list all teams the user belongs to */
export async function getMyTeams(token: string): Promise<TeamsTeam[]> {
  const data = await graphFetch<{ value: TeamsTeam[] }>(
    token,
    "/me/joinedTeams",
    new URLSearchParams({
      $select: "id,displayName,description",
      $top: "20",
    })
  );
  return data?.value ?? [];
}

/** /me/chats — recent chats metadata (no message content) */
export async function getRecentChats(token: string): Promise<TeamsChat[]> {
  const data = await graphFetch<{ value: TeamsChat[] }>(
    token,
    "/me/chats",
    new URLSearchParams({
      $select: "id,chatType,topic,lastUpdatedDateTime",
      $top: "10",
      $orderby: "lastUpdatedDateTime desc",
    })
  );
  return data?.value ?? [];
}

// ─── Context formatter ────────────────────────────────────────────────────────

/** Formats Teams data as a compact plain-text string for AI context injection */
export function formatTeamsContext(
  teams: TeamsTeam[],
  chats: TeamsChat[]
): string {
  const lines: string[] = ["[Microsoft Teams — live data]"];

  if (teams.length === 0) {
    lines.push("Teams: Not a member of any teams");
  } else {
    const names = teams.map((t) => t.displayName).join(", ");
    lines.push(`Teams (${teams.length}): ${names}`);
  }

  const namedGroupChats = chats
    .filter((c) => c.chatType === "group" && c.topic)
    .map((c) => c.topic!)
    .slice(0, 5);

  if (namedGroupChats.length > 0) {
    lines.push(`Active group chats: ${namedGroupChats.join(", ")}`);
  }

  return lines.join("\n");
}
