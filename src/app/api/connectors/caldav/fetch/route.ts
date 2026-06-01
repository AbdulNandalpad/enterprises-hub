/**
 * /api/connectors/caldav/fetch
 *
 * Fetches today's calendar events. Supports two credential modes:
 *
 *  type: "ical-url"  — simple GET to an iCal subscription URL (.ics file).
 *                      Used for IONOS (CalDAV is IP-blocked from Vercel).
 *
 *  type: "caldav"    — full CalDAV REPORT (for other providers).
 *
 * Returns { events: CalDavEvent[] }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, readCalDavCredentials } from "@/lib/api-security";
import type { CalDavEvent } from "@/lib/connectors/caldav/types";

// ─── iCal parser ──────────────────────────────────────────────────────────────

function getICalProp(block: string, key: string): string | null {
  // Unfold multi-line values first
  const unfolded = block.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  return unfolded.match(re)?.[1]?.trim() ?? null;
}

function parseDt(raw: string): { iso: string; isAllDay: boolean } {
  const v = raw.trim();
  if (/^\d{8}$/.test(v)) {
    return { iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00.000Z`, isAllDay: true };
  }
  if (/^\d{8}T\d{6}Z$/i.test(v)) {
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}.000Z`,
      isAllDay: false,
    };
  }
  if (/^\d{8}T\d{6}$/i.test(v)) {
    // Local time — treat as-is (close enough for display)
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}.000Z`,
      isAllDay: false,
    };
  }
  return { iso: new Date().toISOString(), isAllDay: false };
}

function parseDtLine(block: string, key: string): { iso: string; isAllDay: boolean } | null {
  const unfolded = block.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  const m = unfolded.match(re);
  return m ? parseDt(m[1].trim()) : null;
}

function parseICalText(ical: string, targetDate: Date): CalDavEvent[] {
  const events: CalDavEvent[] = [];
  const blocks = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  const dayStart = new Date(targetDate); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd   = new Date(targetDate); dayEnd.setUTCHours(23, 59, 59, 999);

  for (const block of blocks) {
    const status = getICalProp(block, "STATUS");
    if (status === "CANCELLED") continue;

    const startParsed = parseDtLine(block, "DTSTART");
    if (!startParsed) continue;
    const endParsed = parseDtLine(block, "DTEND") ?? startParsed;

    // Filter to target date
    const startMs = new Date(startParsed.iso).getTime();
    const endMs   = new Date(endParsed.iso).getTime();
    if (endMs < dayStart.getTime() || startMs > dayEnd.getTime()) continue;

    events.push({
      uid:      getICalProp(block, "UID") ?? Math.random().toString(36),
      summary:  getICalProp(block, "SUMMARY") ?? "(no title)",
      start:    startParsed.iso,
      end:      endParsed.iso,
      isAllDay: startParsed.isAllDay,
      location: getICalProp(block, "LOCATION") ?? undefined,
    });
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

// ─── iCal URL mode ────────────────────────────────────────────────────────────

async function fetchICalUrl(url: string, targetDate: Date): Promise<CalDavEvent[]> {
  // Normalise webcal:// → https:// in case it slipped through
  const fetchUrl = url.startsWith("webcal://") ? "https://" + url.slice("webcal://".length) : url;
  const res = await fetch(fetchUrl, {
    headers: { "Accept": "text/calendar, text/plain, */*" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`iCal fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return parseICalText(text, targetDate);
}

// ─── CalDAV mode ──────────────────────────────────────────────────────────────

function basicAuth(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function fmtDt(d: Date) {
  return d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

async function tryCalDavReport(
  url: string, auth: string, start: Date, end: Date
): Promise<CalDavEvent[] | null> {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${fmtDt(start)}" end="${fmtDt(end)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "REPORT",
      headers: { "Authorization": auth, "Depth": "1", "Content-Type": "application/xml; charset=utf-8" },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch { return null; }

  if (res.status !== 207 && res.status !== 200) return null;
  const xml = await res.text().catch(() => "");
  const matches = [...xml.matchAll(/<[^:>\s]*:?calendar-data[^>]*>([\s\S]*?)<\/[^:>\s]*:?calendar-data>/gi)];
  const events: CalDavEvent[] = [];
  for (const m of matches) {
    const ical = m[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").trim();
    events.push(...parseICalText(ical, start));
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
      { error: "Calendar not configured. Add credentials in Settings → Connectors." },
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

  // ── iCal URL mode (IONOS) ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyCreds = creds as any;
  if (anyCreds.type === "ical-url" && typeof anyCreds.url === "string") {
    try {
      const events = await fetchICalUrl(anyCreds.url, targetDate);
      return NextResponse.json({ events, mode: "ical-url" });
    } catch (err) {
      console.error("[caldav/fetch] iCal URL error:", err);
      return NextResponse.json(
        { error: `Could not fetch calendar: ${(err as Error).message}` },
        { status: 502 }
      );
    }
  }

  // ── CalDAV mode (other providers) ──────────────────────────────────────────
  if (!anyCreds.user || !anyCreds.pass || !anyCreds.server) {
    return NextResponse.json({ error: "Incomplete CalDAV credentials." }, { status: 400 });
  }

  const auth = basicAuth(anyCreds.user, anyCreds.pass);
  const base = (anyCreds.server as string).replace(/\/$/, "");
  const start = new Date(targetDate); start.setUTCHours(0,0,0,0);
  const end   = new Date(targetDate); end.setUTCHours(23,59,59,999);

  const candidates = [
    `${base}/calendars/${anyCreds.user}/default/`,
    `${base}/calendars/${anyCreds.user}/`,
    `${base}/dav/${anyCreds.user}/calendar/`,
    `${base}/`,
  ];

  for (const url of candidates) {
    const result = await tryCalDavReport(url, auth, start, end);
    if (result !== null) {
      return NextResponse.json({ events: result, calendarUrl: url, mode: "caldav" });
    }
  }

  return NextResponse.json(
    { error: "Could not connect to CalDAV server. Try using an iCal subscription URL instead." },
    { status: 502 }
  );
}
