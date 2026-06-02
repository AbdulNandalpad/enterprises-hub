/**
 * Low-level Microsoft Graph API helpers.
 * All functions take a Bearer access token and return typed data or null on error.
 */

import { GRAPH_BASE_URL } from "./scopes";

// ─── Types ────────────────────────────────────────────────────────────────��───

export interface GraphUser {
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  mail: string | null;
}

export interface GraphEvent {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end:   { dateTime: string; timeZone: string };
  isAllDay: boolean;
  onlineMeeting: { joinUrl: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function graphFetch<T>(token: string, path: string, params?: URLSearchParams): Promise<T | null> {
  const url = `${GRAPH_BASE_URL}${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** /me — basic user profile */
export async function getMe(token: string): Promise<GraphUser | null> {
  return graphFetch<GraphUser>(token, "/me", new URLSearchParams({
    $select: "displayName,jobTitle,department,mail",
  }));
}

/** /me/calendarView — events for today (local midnight → midnight) */
export async function getTodayEvents(token: string): Promise<GraphEvent[]> {
  const now  = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const params = new URLSearchParams({
    startDateTime:  start,
    endDateTime:    end,
    $top:           "15",
    $orderby:       "start/dateTime",
    $select:        "subject,start,end,isAllDay,onlineMeeting",
  });

  const data = await graphFetch<{ value: GraphEvent[] }>(token, "/me/calendarView", params);
  return data?.value ?? [];
}

// ─── Mail ─────────────────────────────────────────────────────────────────────

export interface GraphMessage {
  id:              string;
  subject:         string;
  receivedDateTime: string;
  isRead:          boolean;
  from:            { emailAddress: { name: string; address: string } };
  bodyPreview:     string;
  webLink:         string;
}

/** /me/messages — recent inbox messages */
export async function getRecentMail(token: string, top = 10): Promise<GraphMessage[]> {
  const params = new URLSearchParams({
    $top:     String(top),
    $orderby: "receivedDateTime desc",
    $select:  "id,subject,receivedDateTime,isRead,from,bodyPreview,webLink",
    $filter:  "isDraft eq false",
  });
  const data = await graphFetch<{ value: GraphMessage[] }>(token, "/me/messages", params);
  return data?.value ?? [];
}

/** Unread message count */
export async function getUnreadCount(token: string): Promise<number> {
  const params = new URLSearchParams({
    $count: "true",
    $filter: "isRead eq false and isDraft eq false",
    $top: "1",
    $select: "id",
  });
  const data = await graphFetch<{ "@odata.count"?: number }>(token, "/me/messages", params);
  return data?.["@odata.count"] ?? 0;
}

// ─── Context formatter ────────────────────────────────────────────────────────

/** Formats Graph data into a compact plain-text string for AI context injection */
export function formatGraphContext(user: GraphUser | null, events: GraphEvent[]): string {
  const lines: string[] = ["[Calendar & Profile — live data]"];

  if (user) {
    const parts = [user.displayName];
    if (user.jobTitle)   parts.push(user.jobTitle);
    if (user.department) parts.push(user.department);
    lines.push(`User: ${parts.join(" · ")}`);
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  lines.push(`Today: ${today}`);

  if (events.length === 0) {
    lines.push("Calendar: No meetings today");
  } else {
    lines.push(`Calendar (${events.length} event${events.length !== 1 ? "s" : ""}):`);
    for (const ev of events) {
      if (ev.isAllDay) {
        lines.push(`  • All day  ${ev.subject}`);
      } else {
        const t = (iso: string) =>
          new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        lines.push(`  • ${t(ev.start.dateTime)}–${t(ev.end.dateTime)}  ${ev.subject}`);
      }
    }
  }

  return lines.join("\n");
}
