/**
 * /api/connectors/caldav/fetch
 *
 * Fetches today's calendar events from the user's CalDAV server.
 * Credentials are read from the httpOnly cookie — never from the request body.
 *
 * Strategy (IONOS-first):
 *   1. Try known IONOS URL patterns directly with a REPORT request
 *   2. Fall back to CalDAV well-known discovery if all patterns fail
 *
 * Returns { events: CalDavEvent[], calendarUrl: string }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, readCalDavCredentials } from "@/lib/api-security";
import type { CalDavEvent } from "@/lib/connectors/caldav/types";

// ─── iCal helpers ─────────────────────────────────────────────────────────────

function parseDtLine(block: string, key: string): { iso: string; isAllDay: boolean } | null {
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  const m = block.match(re);
  if (!m) return null;
  const v = m[1].trim();

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    return { iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00.000Z`, isAllDay: true };
  }
  // UTC: YYYYMMDDTHHmmssZ
  if (/^\d{8}T\d{6}Z$/i.test(v)) {
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}.000Z`,
      isAllDay: false,
    };
  }
  // Local time: YYYYMMDDTHHmmss (no timezone — treat as-is)
  if (/^\d{8}T\d{6}$/i.test(v)) {
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}.000Z`,
      isAllDay: false,
    };
  }
  return null;
}

function getICalProp(block: string, key: string): string | null {
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  return block.match(re)?.[1]?.trim() ?? null;
}

function extractVEvents(ical: string): CalDavEvent[] {
  const events: CalDavEvent[] = [];
  // Unfold iCal lines (lines folded with CRLF + whitespace)
  const unfolded = ical.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  for (const block of blocks) {
    const status = getICalProp(block, "STATUS");
    if (status === "CANCELLED") continue;

    const summary  = getICalProp(block, "SUMMARY") ?? "(no title)";
    const uid      = getICalProp(block, "UID") ?? Math.random().toString(36);
    const location = getICalProp(block, "LOCATION") ?? undefined;

    const startParsed = parseDtLine(block, "DTSTART");
    if (!startParsed) continue;
    const endParsed = parseDtLine(block, "DTEND") ?? startParsed;

    events.push({
      uid,
      summary,
      start: startParsed.iso,
      end: endParsed.iso,
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

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function reportBody(start: Date, end: Date): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmt(start)}" end="${fmt(end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** Try a REPORT on a specific calendar URL. Returns events on success, null on failure. */
async function tryReport(
  url: string,
  auth: string,
  start: Date,
  end: Date
): Promise<{ events: CalDavEvent[]; url: string } | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "REPORT",
      headers: {
        "Authorization": auth,
        "Depth": "1",
        "Content-Type": "application/xml; charset=utf-8",
        "Prefer": "return-minimal",
      },
      body: reportBody(start, end),
    });
  } catch {
    return null;
  }

  // 207 Multi-Status = success, 200 also acceptable
  if (res.status !== 207 && res.status !== 200) return null;

  const xml = await res.text().catch(() => "");
  if (!xml) return null;

  // Extract calendar-data blocks (handles namespace prefixes)
  const matches = [...xml.matchAll(/<[^:>\s]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:>\s]*:?calendar-data>/gi)];
  const events: CalDavEvent[] = [];
  for (const m of matches) {
    const ical = m[1]
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
    events.push(...extractVEvents(ical));
  }

  return { events, url };
}

/** Try CalDAV well-known discovery and return the first usable calendar URL */
async function discoverUrl(server: string, user: string, auth: string): Promise<string | null> {
  const base = server.replace(/\/$/, "");

  // PROPFIND well-known → follow to principal
  try {
    const wkRes = await fetch(`${base}/.well-known/caldav`, {
      method: "PROPFIND",
      headers: {
        "Authorization": auth,
        "Depth": "0",
        "Content-Type": "application/xml",
      },
      body: `<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
      redirect: "follow",
    });

    if (wkRes.ok || wkRes.status === 207) {
      const xml = await wkRes.text();
      // Look for href inside current-user-principal
      const hrefMatch = xml.match(/<[^:>]*:?current-user-principal[^>]*>[\s\S]*?<[^:>]*:?href[^>]*>([^<]+)</i);
      if (hrefMatch) {
        const principalPath = hrefMatch[1].trim();
        const principalUrl = principalPath.startsWith("http") ? principalPath : `${base}${principalPath}`;

        // PROPFIND principal → calendar-home-set
        const pRes = await fetch(principalUrl, {
          method: "PROPFIND",
          headers: {
            "Authorization": auth,
            "Depth": "0",
            "Content-Type": "application/xml",
          },
          body: `<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`,
        });

        if (pRes.ok || pRes.status === 207) {
          const pXml = await pRes.text();
          const homeMatch = pXml.match(/<[^:>]*:?calendar-home-set[^>]*>[\s\S]*?<[^:>]*:?href[^>]*>([^<]+)</i);
          if (homeMatch) {
            const homePath = homeMatch[1].trim();
            return homePath.startsWith("http") ? homePath : `${base}${homePath}`;
          }
        }
      }
    }
  } catch { /* ignore discovery errors */ }

  return null;
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

  let targetDate = new Date();
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.date === "string") {
      const p = new Date(body.date);
      if (!isNaN(p.getTime())) targetDate = p;
    }
  } catch { /* use today */ }

  const start = new Date(targetDate); start.setUTCHours(0, 0, 0, 0);
  const end   = new Date(targetDate); end.setUTCHours(23, 59, 59, 999);

  const auth = basicAuth(creds.user, creds.pass);
  const base = creds.server.replace(/\/$/, "");

  // ── Try URL patterns in priority order ─────────────────────────────────────
  // IONOS-specific patterns first, then generic CalDAV discovery
  const urlCandidates = [
    `${base}/calendars/${creds.user}/default/`,
    `${base}/calendars/${creds.user}/default`,
    `${base}/calendars/${creds.user}/calendar/`,
    `${base}/calendars/${creds.user}/`,
    `${base}/dav/${creds.user}/calendar/`,
    `${base}/`,
  ];

  for (const url of urlCandidates) {
    const result = await tryReport(url, auth, start, end);
    if (result !== null) {
      result.events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return NextResponse.json({ events: result.events, calendarUrl: result.url });
    }
  }

  // ── Fall back to well-known discovery ────────────────────────────────────
  const discoveredHome = await discoverUrl(base, creds.user, auth);
  if (discoveredHome) {
    const result = await tryReport(discoveredHome, auth, start, end);
    if (result !== null) {
      result.events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return NextResponse.json({ events: result.events, calendarUrl: result.url });
    }
  }

  // ── Diagnose: check if auth is the issue ─────────────────────────────────
  try {
    const authCheck = await fetch(`${base}/`, {
      method: "PROPFIND",
      headers: { "Authorization": auth, "Depth": "0", "Content-Type": "application/xml" },
      body: `<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
    });
    if (authCheck.status === 401) {
      return NextResponse.json(
        { error: `Authentication failed (401) — check your email and password.` },
        { status: 502 }
      );
    }
    if (authCheck.status === 403) {
      return NextResponse.json(
        { error: `Access denied (403) — CalDAV may not be enabled on this account.` },
        { status: 502 }
      );
    }
    console.error("[caldav/fetch] auth check status:", authCheck.status);
  } catch (e) {
    console.error("[caldav/fetch] auth check error:", e);
  }

  return NextResponse.json(
    { error: `Could not find your calendar on ${base}. Try Test Connection for details.` },
    { status: 502 }
  );
}
