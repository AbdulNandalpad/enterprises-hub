"use client";
import { useState } from "react";

// ── Tab bar ──────────────────────────────────────────────────────────────────
export function TabBar({
  tabs,
  active,
  onChange,
  admin = false,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
  admin?: boolean;
}) {
  return (
    <div className="flex gap-1 mb-5 border-b border-[var(--shell-border)] pb-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            active === t
              ? admin
                ? "bg-[var(--admin-bg)] text-[var(--admin)] border border-[var(--admin-border)]"
                : "bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-border)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--shell-bg)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
export function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] leading-none">{value}</div>
      <div className="text-xs mt-1 text-[var(--text-secondary)]">{sub}</div>
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--shell-border)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Row item ─────────────────────────────────────────────────────────────────
export function RowItem({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  right,
  extra,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)] transition-colors">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor ?? "currentColor" }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</div>
        {sub && <div className="text-xs text-[var(--text-muted)]">{sub}</div>}
        {extra}
      </div>
      {right && <div className="flex-shrink-0 flex flex-col items-end gap-1">{right}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({
  children,
  variant = "gray",
}: {
  children: React.ReactNode;
  variant?: "green" | "blue" | "amber" | "red" | "purple" | "admin" | "gray";
}) {
  const styles: Record<string, string> = {
    green:  "bg-[var(--green-bg)]  text-[var(--green-status)]  border-[var(--green-border)]",
    blue:   "bg-[var(--active-bg)] text-[var(--active-text)]   border-[var(--active-border)]",
    amber:  "bg-[var(--amber-bg)]  text-[var(--amber-status)]  border-[var(--amber-border)]",
    red:    "bg-[var(--red-bg)]    text-[var(--red-status)]    border-[var(--red-border)]",
    purple: "bg-[var(--purple-bg)] text-purple-700             border-[var(--purple-border)]",
    admin:  "bg-[var(--admin-bg)]  text-[var(--admin)]         border-[var(--admin-border)]",
    gray:   "bg-[var(--shell-bg)]  text-[var(--text-secondary)] border-[var(--shell-border)]",
  };
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ── Insight box ───────────────────────────────────────────────────────────────
export function Insight({
  text,
  admin = false,
}: {
  text: React.ReactNode;
  admin?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg border text-xs text-[var(--text-secondary)] leading-relaxed"
      style={{
        background: admin ? "var(--admin-bg)" : "var(--active-bg)",
        borderColor: admin ? "var(--admin-border)" : "var(--active-border)",
        borderLeft: `3px solid ${admin ? "var(--admin)" : "var(--active-text)"}`,
      }}
    >
      <span className="flex-shrink-0 mt-0.5" style={{ color: admin ? "var(--admin)" : "var(--active-text)" }}>
        ✦
      </span>
      <span>{text}</span>
    </div>
  );
}

// ── Info pair row ─────────────────────────────────────────────────────────────
export function InfoPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--shell-border)] last:border-0">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-[var(--shell-border)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
    </div>
  );
}

// ── Field input ───────────────────────────────────────────────────────────────
export function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1 font-semibold">
        {label}
      </div>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full h-8 text-xs border border-[var(--shell-border)] rounded px-2.5 bg-[var(--shell-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--active-text)] transition-colors";

export const selectCls =
  "w-full h-8 text-xs border border-[var(--shell-border)] rounded px-2.5 bg-[var(--shell-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--active-text)] cursor-pointer";

// ── Action buttons ────────────────────────────────────────────────────────────
export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "admin" | "primary";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const styles: Record<string, string> = {
    ghost:   "border border-[var(--shell-border)] text-[var(--text-secondary)] hover:border-[var(--active-text)] hover:text-[var(--active-text)] hover:bg-[var(--active-bg)]",
    admin:   "bg-[var(--admin)] text-white hover:bg-purple-700",
    primary: "bg-[var(--navy)] text-white hover:bg-[var(--brand-red)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors ${styles[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
export function Toggle({ checked = true }: { checked?: boolean }) {
  const [on, setOn] = useState(checked);
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`relative w-8 h-4 rounded-full transition-colors ${on ? "bg-[var(--green-status)]" : "bg-[var(--shell-border)]"}`}
    >
      <span
        className="absolute top-0.5 h-3 w-3 bg-white rounded-full shadow transition-transform"
        style={{ left: on ? "calc(100% - 14px)" : "2px" }}
      />
    </button>
  );
}
