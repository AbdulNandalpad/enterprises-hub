"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SystemSelector, { ALL_SYSTEMS, type SystemDef } from "./SystemSelector";

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

function HexIcon({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1.5L5 5.5L9 1.5" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5.5L5 1.5L9 5.5" />
    </svg>
  );
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Show me Q1 sales performance by region and rep",
  "Summarise pipeline coverage vs target this quarter",
  "Compare order fulfilment rate to last year by product line",
  "Top 10 customers by revenue with growth trend",
  "Win / loss breakdown by deal size and industry",
  "Open opportunities at risk — no activity in 14 days",
  "Monthly recurring revenue trend with forecast",
  "Delivery delays by supplier and logistics partner",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface IntentInputProps {
  onSubmit: (intent: string, systems: SystemDef[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntentInput({ onSubmit }: IntentInputProps) {
  const [value,          setValue]          = useState("");
  const [placeholder,    setPlaceholder]    = useState(0);
  const [focused,        setFocused]        = useState(false);
  const [systemsOpen,    setSystemsOpen]    = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<SystemDef[]>([...ALL_SYSTEMS]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder
  useEffect(() => {
    if (focused && value) return;
    const id = setInterval(() => setPlaceholder((p) => (p + 1) % SUGGESTIONS.length), 3200);
    return () => clearInterval(id);
  }, [focused, value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedSystems);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  const allSelected = selectedSystems.length === ALL_SYSTEMS.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-6 pt-10 pb-6">

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 mb-5">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ color: "var(--text-muted)" }}
          >
            <HexIcon size={11} color="currentColor" />
          </motion.span>
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: "var(--text-muted)" }}>
            Report Builder
          </span>
        </div>

        <h1
          className="text-4xl font-bold leading-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
        >
          What do you want to know?
        </h1>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Describe the report in plain English. Hub AI maps the data sources, confirms the plan, then builds it live.
        </p>
      </motion.div>

      {/* Input canvas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <div
          className="relative"
          style={{
            border:     `1.5px solid ${focused ? "var(--text-primary)" : "var(--shell-border)"}`,
            background: "var(--shell-surface)",
            transition: "border-color 0.25s",
          }}
        >
          {/* Animated placeholder */}
          {!value && (
            <div className="absolute top-5 left-5 right-24 pointer-events-none overflow-hidden" style={{ height: 52 }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={placeholder}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.3, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="text-[15px] leading-relaxed"
                  style={{ color: "var(--text-primary)", fontStyle: "italic" }}
                >
                  "{SUGGESTIONS[placeholder]}"
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKey}
            rows={4}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none px-5 pt-5 pb-14"
            style={{ color: "var(--text-primary)", caretColor: "var(--text-primary)" }}
            aria-label="Report intent"
          />

          {/* Footer bar */}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--shell-border)" }}
          >
            <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              Cmd + Enter to generate
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="font-mono text-[11px] tracking-widest uppercase px-5 py-2 transition-all disabled:opacity-30"
              style={{
                background:  value.trim() ? "var(--text-primary)" : "transparent",
                color:       value.trim() ? "var(--shell-surface)" : "var(--text-muted)",
                border:      "1px solid var(--text-primary)",
              }}
            >
              Build Report
            </button>
          </div>
        </div>

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); textareaRef.current?.focus(); }}
              className="font-mono text-[10px] px-3 py-1.5 border transition-all"
              style={{ borderColor: "var(--shell-border)", color: "var(--text-muted)", background: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--text-primary)";
                (e.currentTarget as HTMLElement).style.color       = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--shell-border)";
                (e.currentTarget as HTMLElement).style.color       = "var(--text-muted)";
              }}
            >
              {s.length > 44 ? s.slice(0, 44) + "…" : s}
            </button>
          ))}
        </div>

        {/* Data sources panel */}
        <div
          className="mt-5"
          style={{
            border:     "1px solid var(--shell-border)",
            background: "var(--shell-surface)",
          }}
        >
          {/* Panel header — toggle */}
          <button
            onClick={() => setSystemsOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors"
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover-bg)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Data Sources
              </span>
              {!allSelected && (
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5"
                  style={{ background: "var(--text-primary)", color: "var(--shell-surface)" }}
                >
                  {selectedSystems.length}/{ALL_SYSTEMS.length} selected
                </span>
              )}
              {allSelected && (
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  (optional — Hub will decide if skipped)
                </span>
              )}
            </div>
            <span style={{ color: "var(--text-muted)" }}>
              {systemsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </span>
          </button>

          {/* Panel body */}
          <AnimatePresence initial={false}>
            {systemsOpen && (
              <motion.div
                key="systems-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-4 pb-4 pt-1">
                  <SystemSelector
                    value={selectedSystems}
                    onChange={setSelectedSystems}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
