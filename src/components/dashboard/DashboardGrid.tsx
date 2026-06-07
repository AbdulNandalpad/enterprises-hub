"use client";

/**
 * DashboardGrid — the customisable widget canvas.
 *
 * No business data is stored here. Widget configuration (type, order, span)
 * lives in DashboardContext → localStorage. Content is fetched live from
 * Microsoft Graph on each load.
 */

import { useState, useMemo } from "react";
import { useDashboard, type WidgetConfig } from "@/contexts/DashboardContext";
import { useGraphData, type GraphData } from "@/lib/connectors/graph/useGraphData";
import { useCalDavEvents } from "@/lib/connectors/caldav/useCalDavEvents";
import { useDemoMode } from "@/lib/demo/useDemoMode";
import { DEMO_PROFILE, DEMO_CALENDAR } from "@/lib/demo/fixtures";
import { WidgetShell } from "./WidgetShell";
import { WidgetPicker } from "./WidgetPicker";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { ProfileWidget } from "./widgets/ProfileWidget";
import { NoteWidget } from "./widgets/NoteWidget";
import { AppsWidget } from "./widgets/AppsWidget";
import { BriefingWidget } from "./widgets/BriefingWidget";
import { TeamsWidget } from "./widgets/TeamsWidget";
import { MailWidget } from "./widgets/MailWidget";
import { SalesforceWidget } from "./widgets/SalesforceWidget";
import { SAPWidget } from "./widgets/SAPWidget";
import {
  IconPlus, IconCalendar, IconPerson, IconStickyNote, IconGrid, IconSunrise, IconMail, IconUsers, IconSalesforce, IconTrendingUp,
} from "@/components/icons";
import type { ReactNode } from "react";

// Map each widget type to its default title and icon
const WIDGET_META: Record<string, { label: string; icon: ReactNode }> = {
  calendar: { label: "Today's Calendar",    icon: <IconCalendar size={13} /> },
  profile:  { label: "My Profile",          icon: <IconPerson size={13} /> },
  note:     { label: "Quick Note",          icon: <IconStickyNote size={13} /> },
  apps:     { label: "Connected Apps",      icon: <IconGrid size={13} /> },
  briefing: { label: "Morning Briefing",    icon: <IconSunrise size={13} /> },
  teams:      { label: "Microsoft Teams",  icon: <IconUsers size={13} /> },
  mail:       { label: "Outlook Mail",     icon: <IconMail size={13} /> },
  salesforce: { label: "Salesforce",         icon: <IconSalesforce size={13} /> },
  sap:        { label: "SAP Sales Cloud",   icon: <IconTrendingUp size={13} /> },
};

function WidgetContent({ widget, graphData, calDavData }: {
  widget: WidgetConfig;
  graphData: ReturnType<typeof useGraphData>;
  calDavData: ReturnType<typeof useCalDavEvents>;
}) {
  switch (widget.type) {
    case "calendar": return <CalendarWidget data={graphData} calDav={calDavData} />;
    case "profile":  return <ProfileWidget  data={graphData} />;
    case "note":     return <NoteWidget widgetId={widget.id} initialContent={widget.noteContent} />;
    case "apps":     return <AppsWidget />;
    case "briefing": return <BriefingWidget />;
    case "teams":    return <TeamsWidget />;
    case "mail":       return <MailWidget />;
    case "salesforce": return <SalesforceWidget />;
    case "sap":        return <SAPWidget />;
    default:           return null;
  }
}

// Build a GraphData-compatible object from demo fixtures (no MSAL calls)
const DEMO_GRAPH_DATA: GraphData = {
  user:            DEMO_PROFILE,
  events:          DEMO_CALENDAR.events.map((ev) => ({
    subject:       ev.subject,
    start:         { dateTime: ev.start, timeZone: "Europe/Berlin" },
    end:           { dateTime: ev.end,   timeZone: "Europe/Berlin" },
    isAllDay:      false,
    onlineMeeting: ev.location === "Teams" ? { joinUrl: "https://teams.microsoft.com/demo" } : null,
  })),
  loading:         false,
  error:           null,
  calendarBlocked: false,
};

export function DashboardGrid() {
  const isDemoMode = useDemoMode();
  const { widgets } = useDashboard();
  const liveGraphData = useGraphData();
  const calDavData    = useCalDavEvents();
  const [pickerOpen, setPickerOpen] = useState(false);

  const graphData: GraphData = useMemo(
    () => isDemoMode ? DEMO_GRAPH_DATA : liveGraphData,
    [isDemoMode, liveGraphData]
  );

  return (
    <>
      {widgets.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--shell-border)] flex items-center justify-center mb-4">
            <IconPlus size={24} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            Your dashboard is blank
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">
            Add widgets to build your personal at-a-glance view.
            Calendar and profile data comes live from Microsoft 365 — nothing stored.
          </p>
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:bg-[var(--navy-hover)] transition-colors"
          >
            <IconPlus size={14} />
            Add first widget
          </button>
        </div>
      ) : (
        /* ── Widget grid ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {widgets.map((widget, idx) => {
              const meta = WIDGET_META[widget.type] ?? { label: widget.type, icon: null };
              return (
                <div
                  key={widget.id}
                  className={widget.span === 2 ? "md:col-span-2" : ""}
                >
                  <WidgetShell
                    widget={widget}
                    defaultTitle={meta.label}
                    icon={meta.icon}
                    isFirst={idx === 0}
                    isLast={idx === widgets.length - 1}
                  >
                    <WidgetContent widget={widget} graphData={graphData} calDavData={calDavData} />
                  </WidgetShell>
                </div>
              );
            })}
          </div>

          {/* Add more */}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--shell-border)] text-sm text-[var(--text-muted)] hover:border-[var(--active-text)] hover:text-[var(--active-text)] hover:bg-[var(--active-bg)] transition-all"
          >
            <IconPlus size={13} />
            Add widget
          </button>
        </div>
      )}

      {/* Widget picker modal */}
      {pickerOpen && <WidgetPicker onClose={() => setPickerOpen(false)} />}
    </>
  );
}
