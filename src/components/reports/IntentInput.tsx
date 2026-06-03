"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface IntentInputProps {
  onSubmit: (intent: string) => void;
}

export default function IntentInput({ onSubmit }: IntentInputProps) {
  const [value,       setValue]       = useState("");
  const [placeholder, setPlaceholder] = useState(0);
  const [focused,     setFocused]     = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder suggestions
  useEffect(() => {
    if (focused && value) return;
    const id = setInterval(() => setPlaceholder((p) => (p + 1) % SUGGESTIONS.length), 3200);
    return () => clearInterval(id);
  }, [focused, value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 mb-5">
          <motion.span
            className="font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "var(--text-muted)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            ⬡ Report Builder
          </motion.span>
        </div>
        <h1
          className="text-4xl font-bold leading-tight mb-3"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
        >
          What do you want to know?
        </h1>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Describe the report in plain English. Claude will map the data sources, confirm the plan, and build it live.
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
            border:     `1.5px solid ${focused ? "var(--ink)" : "var(--shell-border)"}`,
            background: "var(--paper)",
            transition: "border-color 0.25s",
          }}
        >
          {/* Animated placeholder */}
          {!value && (
            <div
              className="absolute top-5 left-5 right-20 pointer-events-none overflow-hidden"
              style={{ height: 52 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={placeholder}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.35, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="text-[15px] leading-relaxed"
                  style={{ color: "var(--ink)", fontStyle: "italic" }}
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
            style={{ color: "var(--ink)", caretColor: "var(--ink)" }}
            aria-label="Report intent"
          />

          {/* Footer */}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--shell-border)" }}
          >
            <span
              className="font-mono text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              ⌘ + Enter to generate
            </span>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="font-mono text-[11px] tracking-widest uppercase px-5 py-2 transition-all disabled:opacity-30"
              style={{
                background:  value.trim() ? "var(--ink)" : "transparent",
                color:       value.trim() ? "var(--paper)" : "var(--text-muted)",
                border:      "1px solid var(--ink)",
              }}
            >
              Build Report →
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); textareaRef.current?.focus(); }}
              className="font-mono text-[10px] px-3 py-1.5 border transition-all hover:border-[var(--ink)] hover:text-[var(--ink)]"
              style={{
                borderColor: "var(--shell-border)",
                color:       "var(--text-muted)",
                background:  "transparent",
              }}
            >
              {s.length > 42 ? s.slice(0, 42) + "…" : s}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
