"use client";

import { useState } from "react";
import { IconCheckSquare, IconPlug } from "@/components/icons";
import Link from "next/link";

const TABS = ["All", "Today", "This Week", "Overdue"] as const;
type Tab = typeof TABS[number];

const SOURCES = [
  { name: "Microsoft To-Do", color: "#0078D4" },
  { name: "Microsoft Planner", color: "#31752F" },
  { name: "Jira", color: "#0052CC" },
  { name: "SAP", color: "#008FD3" },
  { name: "Salesforce", color: "#00A1E0" },
];

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("All");

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">My Tasks</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Unified task view across all connected apps.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[var(--shell-border)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-[var(--navy)] text-[var(--navy)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--hover-bg)] flex items-center justify-center mb-4">
          <IconCheckSquare size={28} className="text-[var(--text-muted)]" />
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">No tasks yet</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
          Connect your apps and tasks from Microsoft To-Do, Jira, SAP and more will appear here automatically.
        </p>

        {/* Source chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SOURCES.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--shell-border)] text-xs text-[var(--text-secondary)] font-mono"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>

        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-hover)] transition-colors"
        >
          <IconPlug size={14} />
          Connect apps
        </Link>
      </div>

    </div>
  );
}
