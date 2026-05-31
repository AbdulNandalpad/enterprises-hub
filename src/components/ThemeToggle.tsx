"use client";

import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";

const OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "light",  label: "Light",  icon: "☀" },
  { mode: "dark",   label: "Dark",   icon: "☾" },
  { mode: "system", label: "System", icon: "⊙" },
];

/** Compact 3-way toggle: Light / Dark / System */
export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="flex items-center border border-[var(--shell-border)] rounded-full p-0.5 bg-[var(--shell-bg)] gap-0.5"
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ mode: m, label, icon }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          title={label}
          aria-pressed={mode === m}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] transition-colors ${
            mode === m
              ? "bg-[var(--navy)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

/** Single icon button — just flips light ↔ dark */
export function ThemeToggleSimple() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
    >
      {resolved === "dark" ? "☀" : "☾"}
    </button>
  );
}
