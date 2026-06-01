"use client";

/**
 * BriefingWidget — runs the "Morning Briefing" AI Function and displays the result.
 *
 * Auto-runs once on mount if an AI key is configured.
 * User can re-run at any time with the Refresh button.
 */

import { useEffect, useRef, useState } from "react";
import { useAIFunction } from "@/lib/ai-functions/useAIFunction";
import { useAI } from "@/contexts/AIContext";
import { IconSunrise, IconArrowRight } from "@/components/icons";
import { MarkdownMessage } from "@/components/MarkdownMessage";

const FUNCTION_ID = "morning-briefing";

export function BriefingWidget() {
  const { keyConfigured } = useAI();
  const { run, result, loading, error, reset } = useAIFunction();
  const hasAutoRun = useRef(false);

  // Auto-run once on mount when key is available
  useEffect(() => {
    if (keyConfigured && !hasAutoRun.current) {
      hasAutoRun.current = true;
      run(FUNCTION_ID);
    }
  }, [keyConfigured, run]);

  // ── No key configured ──────────────────────────────────────────────────────
  if (!keyConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3 px-4">
        <IconSunrise size={24} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">
          Configure an AI key in{" "}
          <a href="/dashboard/settings" className="text-[var(--active-text)] hover:underline">
            Settings → AI
          </a>{" "}
          to enable briefings.
        </p>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <IconSunrise size={13} className="animate-pulse" />
          <span>Generating your briefing…</span>
        </div>
        {/* Skeleton lines */}
        <div className="space-y-2">
          {[100, 90, 75, 85, 60].map((w, i) => (
            <div
              key={i}
              className="h-2.5 rounded bg-[var(--shell-border)] animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-[var(--red-status)]">{error}</p>
        <button
          onClick={() => { reset(); run(FUNCTION_ID); }}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <IconArrowRight size={11} />
          Try again
        </button>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-[var(--text-primary)]">
          <MarkdownMessage content={result} />
        </div>
        <button
          onClick={() => { reset(); run(FUNCTION_ID); }}
          className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--active-text)] transition-colors"
        >
          <IconSunrise size={10} />
          Refresh briefing
        </button>
      </div>
    );
  }

  // ── Idle (no key issue, just hasn't run yet) ───────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3 px-4">
      <IconSunrise size={24} className="text-[var(--text-muted)]" />
      <button
        onClick={() => run(FUNCTION_ID)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:bg-[var(--navy-hover)] transition-colors"
      >
        <IconSunrise size={13} />
        Run Morning Briefing
      </button>
    </div>
  );
}
