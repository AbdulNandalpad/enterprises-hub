/**
 * /api/connectors/caldav/fetch
 *
 * Fetches today's calendar events from the user's CalDAV server.
 * Credentials are read from the httpOnly cookie — never from the request body.
 *
 * POST { date?: string }  — ISO date string (defaults to today)
 *
 * Discovery flow:
 *   1. PROPFIND {server}/.well-known/caldav → follow redirect to principal
 *   2. PROPFIND principal → calendar-home-set
 *   3. PROPFIND calendar home → find first VCALENDAR collection
 *   4. REPORT on that collection → today's VEVENT items
 *
 * Returns { events: CalDavEvent[] }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, readCalDavCredentials } from "@/lib/api-security";
import type { CalDavEvent } from "@/lib/connectors/caldav/types";

// ─── iCal helpers ─────────────────────────────────────────────────────────────

/** Parse a single property value from an iCal line, handling folded lines */
function getICalProp(block: string, key: string): string | null {
  // Match KEY, KEY;PARAM=VAL, etc.
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

/** Convert iCal DTSTART/DTEND value to an ISO 8601 string.
 *  Handles: DATE-TIME UTC (Z), DATE-TIME local, DATE (all-day) */
function parseICalDate(raw: string): { iso: string; isAllDay: boolean } {
  const v = raw.trim();

  // All-day: YYYYMMDD (no T)
  if (/^\d{8}$/.test(v)) {
    const y = v.slice(0, 4), mo = v.slice(4, 6), d = v.slice(6, 8);
    return { iso: `${y}-${mo}-${d}T00:00:00.000Z`, isAllDay: true };
  }

  // DATE-TIME UTC: YYYYMMDDTHHmmssZ
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = v.slice(0, 4), mo = v.slice(4, 6), d = v.slice(6, 8);
    const h = v.slice(9, 11), mi = v.slice(11, 13), s = v.slice(13, 15);
    return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`, isAllDay: false };
  }

  // DATE-TIME local: YYYYMMDDTHHmmss (treat as local, convert naively)
  if (/^\d{8}T\d{6}$/.test(v)) {
    const y = v.slice(0, 4), mo = v.slice(4, 6), d = v.slice(6, 8);
    const h = v.slice(9, 11), mi = v.slice(11, 13), s = v.slice(13, 15);
    // Return as-is with Z suffix — caller handles display in local time
    return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`, isAllDay: false };
  }

  // Fallback
  return { iso: new Date().toISOString(), isAllDay: false };
}

/** Parse iCal DTSTART line (may have TZID param before the colon) */
function parseDtLine(block: string, key: string): { iso: string; isAllDay: boolean } | null {
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  const m = block.match(re);
  if (!m) return null;
  return parseICalDate(m[1].trim());
}

/** Extract all VEVENT blocks from a VCALENDAR string */
function extractVEvents(ical: string): CalDavEvent[] {
  const events: CalDavEvent[] = [];
  const blocks = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  for (const block of blocks) {
    const summary  = getICalProp(block, "SUMMARY") ?? "(no title)";
    const uid      = getICalProp(block, "UID")     ?? Math.random().toString(36);
    const location = getICalProp(block, "LOCATION") ?? undefined;
    const status   = getICalProp(block, "STATUS");

    // Skip cancelled events
    if (status === "CANCELLED") continue;

    const startParsed = parseDtLine(block, "DTSTART");
    const endParsed   = parseDtLine(block, "DTEND") ?? startParsed;
    if (!startParsed) continue;

    events.push({
      uid,
      summary,
      start:    startParsed.iso,
      end:      endParsed!.iso,
      isAllDay: startParsed.isAllDay,
      location,
    });
  }

  return events;
}

// ─── CalDAV HTTP helpers ──────────────────────────────────────────────────────

function basicAuth(user: string, pass: string): string {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

/** PROPFIND a URL and return the response body as text */
async function propfind(url: string, auth: string, body: string, depth = "0"): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "PROPFIND",
      headers: {
        "Authorization": auth,
        "Depth": depth,
        "Content-Type": "application/xml; charset=utf-8",
      },
      body,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

/** Extract a single XML element value (simple regex, not a full XML parser) */
function xmlVal(xml: string, tag: string): string | null {
  // Match <tag>, <ns:tag>, with or without namespace prefixes in the response
  const re = new RegExp(`<[^:>/]*:?${tag}[^>]*>([^<]+)<`, "i");
  return xml.match(re)?.[1]?.trim() ?? null;
}

/** Extract all href values from a multistatus response */
function xmlHrefs(xml: string): string[] {
  return [...xml.matchAll(/<[^:>]*:?href[^>]*>([^<]+)</gi)].map((m) => m[1].trim());
}

/** Discover the user's default calendar URL via CalDAV auto-discovery */
async function discoverCalendarUrl(server: string, user: string, pass: string): Promise<string | null> {
  const auth = basicAuth(user, pass);
  const base = server.replace(/\/$/, "");

  // Step 1: well-known redirect → principal URL
  const wellKnown = `${base}/.well-known/caldav`;
  const principalXml = await propfind(wellKnown, auth, `
    <d:propfind xmlns:d="DAV:">
      <d:prop><d:current-user-principal/></d:prop>
    </d:propfind>`, "0");

  // Step 2: find calendar-home-set on the principal
  let calHome: string | null = null;

  if (principalXml) {
    const hrefs = xmlHrefs(principalXml);
    // The first href that isn't .well-known is typically the principal
    const principalPath = hrefs.find((h) => !h.includes(".well-known")) ?? `/principals/${user}/`;
    const principalUrl = principalPath.startsWith("http") ? principalPath : `${base}${principalPath}`;

    const homeXml = await propfind(principalUrl, auth, `
      <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop><c:calendar-home-set/></d:prop>
      </d:propfind>`, "0");

    if (homeXml) {
      const homeHref = xmlHrefs(homeXml).find((h) => h.includes("calendar") || h.includes("home"));
      if (homeHref) calHome = homeHref.startsWith("http") ? homeHref : `${base}${homeHref}`;
    }
  }

  // Fallback: try common IONOS path pattern
  if (!calHome) {
    calHome = `${base}/calendars/${user}/`;
  }

  // Step 3: list calendars in the home collection
  const calListXml = await propfind(calHome, auth, `
    <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
      <d:prop>
        <d:resourcetype/>
        <d:displayname/>
      </d:prop>
    </d:propfind>`, "1");

  if (calListXml) {
    const hrefs = xmlHrefs(calListXml);
    // Find a calendar collection href (not the home itself)
    const calHref = hrefs.find((h) => h !== calHome?.replace(base, "") && (h.includes("calendar") || h.includes("default") || h.endsWith("/")));
    if (calHref) {
      return calHref.startsWith("http") ? calHref : `${base}${calHref}`;
    }
  }

  // Last resort: assume calendar is at /calendars/{user}/default/
  return `${base}/calendars/${user}/default/`;
}

/** REPORT query to get events for a date range */
async function fetchCalDavEvents(calendarUrl: string, auth: string, startDate: Date, endDate: Date): Promise<CalDavEvent[]> {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(startDate)}" end="${fmt(endDate)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const res = await fetch(calendarUrl, {
    method: "REPORT",
    headers: {
      "Authorization": auth,
      "Depth": "1",
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: reportBody,
  });

  if (!res.ok) {
    throw new Error(`CalDAV REPORT failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();

  // Extract all calendar-data blocks from the multistatus response
  const calDataMatches = [...xml.matchAll(/<[^:>]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:>]*:?calendar-data>/gi)];

  const events: CalDavEvent[] = [];
  for (const match of calDataMatches) {
    const ical = match[1]
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    events.push(...extractVEvents(ical));
  }

  return events;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const creds = await readCalDavCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "CalDAV not configured. Add credentials in Settings → Connectors." },
      { status: 401 }
    );
  }

  // Parse optional date override from body
  let targetDate = new Date();
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.date === "string") {
      const parsed = new Date(body.date);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
  } catch { /* use today */ }

  // Build day range in UTC
  const start = new Date(targetDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setUTCHours(23, 59, 59, 999);

  try {
    const auth = basicAuth(creds.user, creds.pass);

    // Discover calendar URL
    const calendarUrl = await discoverCalendarUrl(creds.server, creds.user, creds.pass);
    if (!calendarUrl) {
      return NextResponse.json({ error: "Could not find calendar on server." }, { status: 502 });
    }

    const events = await fetchCalDavEvents(calendarUrl, auth, start, end);

    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({ events, calendarUrl });
  } catch (err) {
    console.error("[/api/connectors/caldav/fetch]", err);
    return NextResponse.json(
      { error: "Could not connect to calendar server. Check your credentials." },
      { status: 502 }
    );
  }
}
