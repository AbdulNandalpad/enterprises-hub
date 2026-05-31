"use client";

import type { GraphData } from "@/lib/connectors/graph/useGraphData";
import type { GraphEvent } from "@/lib/connectors/graph/client";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isOngoing(ev: GraphEvent): boolean {
  const now = Date.now();
  return new Date(ev.start.dateTime).getTime() <= now && new Date(ev.end.dateTime).getTime() >= now;
}

function isPast(ev: GraphEvent): boolean {
  return new Date(ev.end.dateTime).getTime() < Date.now();
}

export function CalendarWidget({ data }: { data: GraphData }) {
  const { events, loading } = data;

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-[var(--shell-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No meetings today</p>
        <p className="text-xs text-[var(--text-muted)]">
          {data.error ? "Calendar access not granted — add Calendars.Read scope to see events" : "Your calendar is clear"}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--shell-border)]">
      {events.map((ev, i) => {
        const past    = isPast(ev);
        const ongoing = isOngoing(ev);
        return (
          <div
            key={i}
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
                  {formatTime(ev.start.dateTime)}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug truncate ${ongoing ? "font-semibold text-[var(--active-text)]" : "text-[var(--text-primary)]"}`}>
                {ev.subject}
              </p>
              {!ev.isAllDay && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  until {formatTime(ev.end.dateTime)}
                </p>
              )}
            </div>

            {/* Online indicator */}
            {ev.onlineMeeting && (
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
