"use client";

import { useDashboard, type WidgetType } from "@/contexts/DashboardContext";
import { IconX, IconCalendar, IconPerson, IconStickyNote, IconGrid, IconSunrise, IconMail, IconUsers, IconSalesforce, IconTrendingUp } from "@/components/icons";
import type { ReactNode } from "react";

interface WidgetOption {
  type: WidgetType;
  label: string;
  description: string;
  source: string;
  icon: ReactNode;
}

const OPTIONS: WidgetOption[] = [
  {
    type: "calendar",
    label: "Today's Calendar",
    description: "Your meetings and events for today, live from Microsoft 365.",
    source: "Microsoft Graph",
    icon: <IconCalendar size={20} />,
  },
  {
    type: "profile",
    label: "My Profile",
    description: "Your name, job title, department and email from Azure AD.",
    source: "Microsoft Graph",
    icon: <IconPerson size={20} />,
  },
  {
    type: "note",
    label: "Quick Note",
    description: "A personal scratchpad. Saves to this browser — not synced to any server.",
    source: "Local only",
    icon: <IconStickyNote size={20} />,
  },
  {
    type: "apps",
    label: "Connected Apps",
    description: "Quick-access grid of all your connected enterprise apps.",
    source: "Static",
    icon: <IconGrid size={20} />,
  },
  {
    type: "briefing",
    label: "Morning Briefing",
    description: "AI-generated daily overview — calendar, emails, priorities. Auto-refreshes each morning.",
    source: "AI Function",
    icon: <IconSunrise size={20} />,
  },
  {
    type: "teams",
    label: "Microsoft Teams",
    description: "Your joined teams and recent chats, live from Microsoft 365.",
    source: "Microsoft Graph",
    icon: <IconUsers size={20} />,
  },
  {
    type: "mail",
    label: "Outlook Mail",
    description: "Recent inbox messages with unread count. Click any email to open in Outlook.",
    source: "Microsoft Graph",
    icon: <IconMail size={20} />,
  },
  {
    type: "salesforce",
    label: "Salesforce CRM",
    description: "Live pipeline, opportunities and contacts from your Salesforce org.",
    source: "Salesforce API",
    icon: <IconSalesforce size={20} />,
  },
  {
    type: "sap",
    label: "SAP Sales Cloud",
    description: "Opportunities, accounts and activities from SAP C4C — live via OData.",
    source: "SAP OData v2",
    icon: <IconTrendingUp size={20} />,
  },
];

interface Props {
  onClose: () => void;
}

export function WidgetPicker({ onClose }: Props) {
  const { addWidget } = useDashboard();

  function pick(type: WidgetType) {
    addWidget(type);
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--shell-border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add widget</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Pick what to show on your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Options */}
        <div className="p-3 space-y-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => pick(opt.type)}
              className="w-full flex items-start gap-4 p-3 rounded-xl border border-[var(--shell-border)] hover:border-[var(--active-text)] hover:bg-[var(--active-bg)] text-left transition-all group"
            >
              <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--shell-bg)] border border-[var(--shell-border)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--active-text)] transition-colors">
                {opt.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{opt.description}</p>
                <span className="inline-block mt-1.5 text-[10px] font-mono text-[var(--text-muted)] border border-[var(--shell-border)] px-1.5 py-0.5 rounded">
                  {opt.source}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
