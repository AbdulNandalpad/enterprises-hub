"use client";

import { useState } from "react";
import { useUIPrefs } from "@/contexts/UIPrefsContext";
import { IconInfo, IconX, IconArrowRight } from "@/components/icons";

const RENAMEABLE_LABELS = [
  { key: "Dashboard",    group: "Navigation",  desc: "Main workspace home" },
  { key: "My Tasks",     group: "Navigation",  desc: "Personal task list" },
  { key: "Search",       group: "Navigation",  desc: "Global search page" },
  { key: "Settings",     group: "Navigation",  desc: "Settings page link" },
  { key: "User",         group: "Mode toggle", desc: "User mode pill in the top bar" },
  { key: "Admin",        group: "Mode toggle", desc: "Admin mode pill in the top bar" },
  { key: "Apps",         group: "Sidebar",     desc: "Apps section heading" },
  { key: "Workspace",    group: "Sidebar",     desc: "Workspace section heading" },
];

const GROUPS = Array.from(new Set(RENAMEABLE_LABELS.map((l) => l.group)));

export function LabelsSettings() {
  const { prefs, setLabel, getLabel, reset } = useUIPrefs();

  // Track edited values per key — empty string means "use default"
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const { key } of RENAMEABLE_LABELS) {
      init[key] = prefs.labelOverrides[key] ?? "";
    }
    return init;
  });

  function handleChange(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(key: string) {
    setLabel(key, drafts[key]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, key: string) {
    if (e.key === "Enter") {
      setLabel(key, drafts[key]);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setDrafts((prev) => ({ ...prev, [key]: prefs.labelOverrides[key] ?? "" }));
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Reset all label overrides to their defaults?"
    );
    if (!confirmed) return;
    // Clear only labelOverrides, keep other prefs
    const cleared: Record<string, string> = {};
    for (const { key } of RENAMEABLE_LABELS) cleared[key] = "";
    setDrafts(cleared);
    // Reset each label individually
    for (const { key } of RENAMEABLE_LABELS) setLabel(key, "");
  }

  const hasAnyOverride = Object.values(prefs.labelOverrides).some(Boolean);

  return (
    <div className="space-y-8">

      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Custom Labels</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Rename any label in the interface. Leave blank to use the default.
              Changes apply instantly — no save needed.
            </p>
          </div>
          {hasAnyOverride && (
            <button
              onClick={handleReset}
              className="flex-shrink-0 text-[11px] font-mono text-[var(--red-status)] hover:underline"
            >
              Reset all
            </button>
          )}
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group}>
          <h4 className="text-[11px] font-mono font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
            {group}
          </h4>
          <div className="space-y-2">
            {RENAMEABLE_LABELS.filter((l) => l.group === group).map(({ key, desc }) => {
              const current = getLabel(key);
              const isOverridden = !!prefs.labelOverrides[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]"
                >
                  {/* Default label */}
                  <div className="w-28 flex-shrink-0">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{key}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</div>
                  </div>

                  {/* Arrow */}
                  <IconArrowRight size={14} className="flex-shrink-0 text-[var(--text-muted)]" />

                  {/* Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={drafts[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      onBlur={() => handleBlur(key)}
                      onKeyDown={(e) => handleKeyDown(e, key)}
                      placeholder={key}
                      maxLength={50}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--active-text)] transition-colors ${
                        isOverridden
                          ? "border-[var(--active-text)]"
                          : "border-[var(--shell-border)]"
                      }`}
                    />
                    {isOverridden && (
                      <button
                        onClick={() => {
                          setDrafts((prev) => ({ ...prev, [key]: "" }));
                          setLabel(key, "");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors"
                        title="Reset to default"
                      >
                        <IconX size={12} />
                      </button>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="w-20 flex-shrink-0 text-right">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      shows as
                    </span>
                    <div className={`text-xs font-medium truncate ${
                      isOverridden ? "text-[var(--active-text)]" : "text-[var(--text-secondary)]"
                    }`}>
                      {current}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <IconInfo size={14} className="flex-shrink-0 mt-0.5 text-[var(--text-muted)]" />
        <p className="text-[11px] font-mono text-[var(--text-muted)]">
          Press <kbd className="px-1 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[10px]">Enter</kbd> to apply
          or <kbd className="px-1 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[10px]">Esc</kbd> to cancel.
          Labels are stored locally in your browser.
        </p>
      </section>

    </div>
  );
}
