"use client";

import type { GraphData } from "@/lib/connectors/graph/useGraphData";
import type { GraphEvent } from "@/lib/connectors/graph/client";
import type { CalDavState } from "@/lib/connectors/caldav/useCalDavEvents";
import type { CalDavEvent } from "@/lib/connectors/caldav/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Unified event shape ──────────────────────────────────────────────────────

interface UnifiedEvent {
  id: string;
  subject: string;
  startIso: string;
  endIso: string;
  isAllDay: boolean;
  onlineUrl?: string;
  source: "graph" | "caldav";
}

function fromGraph(ev: GraphEvent, i: number): UnifiedEvent {
  return {
    id: `graph-${i}`,
    subject: ev.subject,
    startIso: ev.start.dateTime,
    endIso: ev.end.dateTime,
    isAllDay: ev.isAllDay,
    onlineUrl: ev.onlineMeeting?.joinUrl,
    source: "graph",
  };
}

function fromCalDav(ev: CalDavEvent): UnifiedEvent {
  return {
    id: `caldav-${ev.uid}`,
    subject: ev.summary,
    startIso: ev.start,
    endIso: ev.end,
    isAllDay: ev.isAllDay,
    source: "caldav",
  };
}

function isOngoing(ev: UnifiedEvent): boolean {
  const now = Date.now();
  return new Date(ev.startIso).getTime() <= now && new Date(ev.endIso).getTime() >= now;
}

function isPast(ev: UnifiedEvent): boolean {
  return new Date(ev.endIso).getTime() < Date.now();
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function CalendarWidget({
  data,
  calDav,
}: {
  data: GraphData;
  calDav?: CalDavState;
}) {
  const loading = data.loading || (calDav?.loading ?? false);

  // Skeleton
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-[var(--shell-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  // Merge events from both sources, sort by start time, deduplicate by subject+time
  const graphEvents = data.events.map((ev, i) => fromGraph(ev, i));
  const calDavEvents = (calDav?.configured ? calDav.events : []).map(fromCalDav);

  const allEvents: UnifiedEvent[] = [...graphEvents, ...calDavEvents].sort(
    (a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime()
  );

  // Empty state
  if (allEvents.length === 0) {
    const graphBlocked = data.calendarBlocked;
    const calDavConfigured = calDav?.configured ?? false;
    const calDavError = calDav?.error;

    if (graphBlocked && !calDavConfigured) {
      return (
        <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">Calendar not connected</p>
          <p className="text-xs text-[var(--text-muted)]">
            Sign out and back in to grant Microsoft calendar access, or configure
            an IONOS calendar in <strong>Settings → Connectors → IONOS Calendar</strong>.
          </p>
        </div>
      );
    }

    if (calDavError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm font-medium text-[var(--red-status)]">Calendar error</p>
          <p className="text-xs text-[var(--text-muted)]">{calDavError}</p>
        </div>
      );
    }

    return (
      <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No meetings today</p>
        <p className="text-xs text-[var(--text-muted)]">
          Your confirmed calendar is clear — pending invitations won&apos;t appear until accepted.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--shell-border)]">
      {allEvents.map((ev) => {
        const past    = isPast(ev);
        const ongoing = isOngoing(ev);
        return (
          <div
            key={ev.id}
            className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
              ongoing ? "bg-[var(--active-bg)]" : past ? "opacity-50" : "hover:bg-[var(--hover-bg)]"
            }`}
          >
            {/* Time */}
            <div className="w-[4.5rem] flex-shrink-0 pt-0.5">
              {ev.isAllDay ? (
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">All day</span>
              ) : (
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {formatTime(ev.startIso)}
                </span>
              )}
            </div>

            {/* Title + source badge */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug truncate ${
                ongoing ? "font-semibold text-[var(--active-text)]" : "text-[var(--text-primary)]"
              }`}>
                {ev.subject}
              </p>
              {!ev.isAllDay && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  until {formatTime(ev.endIso)}
                  {ev.source === "caldav" && (
                    <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)] opacity-60">IONOS</span>
                  )}
                </p>
              )}
            </div>

            {/* Online badge */}
            {ev.onlineUrl && (
              <span className="flex-shrink-0 text-[10px] font-mono text-[var(--blue-status)] border border-[var(--blue-border)] bg-[var(--blue-bg)] px-1.5 py-0.5 rounded">
                online
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
