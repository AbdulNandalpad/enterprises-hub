"use client";

import { useState, useRef, useEffect } from "react";
import { IconSearch } from "@/components/icons";

const SOURCES = [
  { name: "Microsoft 365", desc: "Emails, files, calendar events", color: "#D83B01" },
  { name: "Microsoft Teams", desc: "Messages, channels, chats", color: "#6264A7" },
  { name: "Jira", desc: "Tickets, sprints, projects", color: "#0052CC" },
  { name: "SharePoint", desc: "Documents, pages, lists", color: "#0078D4" },
  { name: "SAP", desc: "Orders, invoices, records", color: "#008FD3" },
  { name: "Salesforce", desc: "Contacts, opportunities, cases", color: "#00A1E0" },
];

const TIPS = [
  "Try "project kickoff" to find related emails and documents",
  "Search by person name to surface everything connected to them",
  "Use "invoice #4821" to find records across SAP and email",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount and on Cmd/Ctrl+K
  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const trimmed = query.trim();

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Search</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Search across all connected apps from one place.
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <IconSearch size={18} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails, files, tickets, records…"
          className="w-full pl-11 pr-20 py-3.5 bg-[var(--shell-surface)] border border-[var(--shell-border)] text-[var(--text-primary)] text-sm rounded-xl focus:outline-none focus:border-[var(--navy)] placeholder:text-[var(--text-muted)] shadow-sm"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)] border border-[var(--shell-border)] rounded px-1.5 py-0.5 bg-[var(--shell-bg)]">
          <span>⌘</span><span>K</span>
        </kbd>
      </div>

      {/* No query — show sources + tips */}
      {!trimmed && (
        <div className="space-y-6">

          {/* Searchable sources */}
          <div>
            <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
              Searchable sources
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOURCES.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
              Tips
            </p>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)] mt-0.5 flex-shrink-0">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

      {/* Query entered — coming soon */}
      {trimmed && (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--hover-bg)] flex items-center justify-center mx-auto mb-3">
            <IconSearch size={22} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            Searching for &ldquo;{trimmed}&rdquo;
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Cross-app search is coming in the next release.
          </p>
        </div>
      )}

    </div>
  );
}
