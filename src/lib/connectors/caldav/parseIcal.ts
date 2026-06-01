/**
 * Client-side iCal parser — works in the browser.
 * Shared between useCalDavEvents (localStorage ICS upload) and the server-side
 * fetch route (which has its own copy for Node.js).
 */

import type { CalDavEvent } from "./types";

const LS_KEY_DATA     = "eh_ical_data";
const LS_KEY_FILENAME = "eh_ical_filename";
const LS_KEY_UPDATED  = "eh_ical_updated";

// ── iCal text helpers ─────────────────────────────────────────────────────────

function getICalProp(block: string, key: string): string | null {
  const unfolded = block.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, "im");
  return unfolded.match(re)?.[1]?.trim() ?? null;
}

function parseDt(raw: string): { iso: string; isAllDay: boolean } {
  const v = raw.trim();
  if (/^\d{8}$/.test(v)) {
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00.000Z`,
      isAllDay: true,
    };
  }
  if (/^\d{8}T\d{6}Z$/i.test(v)) {
    return {
      iso: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}.000Z`,
      isAllDay: false,
    };
  }
  if (/^\d{8}T\d{6}$/i.test(v)) {
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

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseICalText(ical: string, targetDate: Date): CalDavEvent[] {
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

// ── localStorage helpers ──────────────────────────────────────────────────────

export function saveIcsToStorage(icsText: string, filename: string) {
  try {
    localStorage.setItem(LS_KEY_DATA,     icsText);
    localStorage.setItem(LS_KEY_FILENAME, filename);
    localStorage.setItem(LS_KEY_UPDATED,  new Date().toISOString());
  } catch {
    // Storage full — silently ignore
  }
}

export function clearIcsFromStorage() {
  localStorage.removeItem(LS_KEY_DATA);
  localStorage.removeItem(LS_KEY_FILENAME);
  localStorage.removeItem(LS_KEY_UPDATED);
}

export interface StoredIcsInfo {
  data: string;
  filename: string;
  updatedAt: string;
}

export function loadIcsFromStorage(): StoredIcsInfo | null {
  try {
    const data = localStorage.getItem(LS_KEY_DATA);
    if (!data) return null;
    return {
      data,
      filename: localStorage.getItem(LS_KEY_FILENAME) ?? "calendar.ics",
      updatedAt: localStorage.getItem(LS_KEY_UPDATED) ?? "",
    };
  } catch {
    return null;
  }
}
