"use client";

import { motion, AnimatePresence } from "framer-motion";

// ─── System definitions ───────────────────────────────────────────────────────

export interface SystemDef {
  id:       string;
  label:    string;
  sublabel: string;
  color:    string;
  icon:     string;
}

export const ALL_SYSTEMS: SystemDef[] = [
  {
    id:       "sap",
    label:    "SAP S/4HANA",
    sublabel: "Orders · Finance · Delivery",
    color:    "#F0A500",
    icon:     "SAP",
  },
  {
    id:       "salesforce",
    label:    "Salesforce CRM",
    sublabel: "Opportunities · Accounts · Forecast",
    color:    "#00A1E0",
    icon:     "SF",
  },
  {
    id:       "context",
    label:    "Hub Context",
    sublabel: "Role · Calendar · Activity",
    color:    "#C8341A",
    icon:     "HUB",
  },
];

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

function ChevronUp() {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5L4 2L7 5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1L4 4L7 1" />
    </svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4L3.5 6.5L9 1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4.5 1v7M1 4.5h7" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SystemSelectorProps {
  value:    SystemDef[];
  onChange: (systems: SystemDef[]) => void;
}

export default function SystemSelector({ value, onChange }: SystemSelectorProps) {
  const selectedIds = new Set(value.map((s) => s.id));

  const toggle = (id: string) => {
    if (selectedIds.has(id)) {
      if (value.length <= 1) return; // keep at least one selected
      onChange(value.filter((s) => s.id !== id));
    } else {
      const sys = ALL_SYSTEMS.find((s) => s.id === id);
      if (sys) onChange([...value, sys]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === value.length - 1) return;
    const next = [...value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const unselected = ALL_SYSTEMS.filter((s) => !selectedIds.has(s.id));

  return (
    <div className="space-y-2">
      {/* Selected & ordered systems */}
      <AnimatePresence initial={false}>
        {value.map((sys, i) => (
          <motion.div
            key={sys.id}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2"
            style={{
              border:     `1px solid ${sys.color}44`,
              background: `${sys.color}08`,
              padding:    "10px 12px",
            }}
          >
            {/* Order controls */}
            <div className="flex flex-col gap-px mr-1">
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                aria-label="Move up"
                className="w-5 h-4 flex items-center justify-center rounded-sm transition-opacity disabled:opacity-20 hover:opacity-60"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronUp />
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === value.length - 1}
                aria-label="Move down"
                className="w-5 h-4 flex items-center justify-center rounded-sm transition-opacity disabled:opacity-20 hover:opacity-60"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronDown />
              </button>
            </div>

            {/* Order number */}
            <span
              className="font-mono text-[10px] w-4 text-center flex-shrink-0"
              style={{ color: sys.color, opacity: 0.6 }}
            >
              {i + 1}
            </span>

            {/* Icon badge */}
            <span
              className="font-mono text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0"
              style={{
                background: sys.color + "18",
                color:      sys.color,
                border:     `1px solid ${sys.color}44`,
              }}
            >
              {sys.icon}
            </span>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-none" style={{ color: "var(--ink)" }}>
                {sys.label}
              </p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {sys.sublabel}
              </p>
            </div>

            {/* Toggle off */}
            <button
              onClick={() => toggle(sys.id)}
              aria-label={`Remove ${sys.label}`}
              className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 flex-shrink-0 transition-opacity hover:opacity-70"
              style={{
                background:  sys.color + "18",
                color:       sys.color,
                border:      `1px solid ${sys.color}44`,
              }}
            >
              <CheckIcon color={sys.color} />
              Included
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Unselected systems */}
      {unselected.map((sys) => (
        <div
          key={sys.id}
          className="flex items-center gap-2 opacity-40"
          style={{
            border:     "1px solid var(--shell-border)",
            background: "transparent",
            padding:    "10px 12px",
          }}
        >
          {/* Spacer for order controls */}
          <div className="w-6 mr-1" />
          <div className="w-4" />

          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0"
            style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}>
            {sys.icon}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium leading-none" style={{ color: "var(--text-secondary)" }}>
              {sys.label}
            </p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {sys.sublabel}
            </p>
          </div>

          <button
            onClick={() => toggle(sys.id)}
            aria-label={`Add ${sys.label}`}
            className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
          >
            <PlusIcon />
            Include
          </button>
        </div>
      ))}

      {/* Reset link */}
      <div className="pt-1">
        <button
          onClick={() => onChange([...ALL_SYSTEMS])}
          className="font-mono text-[10px] tracking-widest uppercase transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        >
          Reset to all systems
        </button>
      </div>
    </div>
  );
}
