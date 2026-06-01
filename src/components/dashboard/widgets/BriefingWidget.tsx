"use client";

/**
 * BriefingWidget — runs the "Morning Briefing" AI Function and displays the result.
 *
 * Result is cached in localStorage for 12 hours so navigating away and back
 * does not trigger a new API call. User can still force a refresh manually.
 */

import { useEffect, useRef, useState } from "react";
import { useAIFunction } from "@/lib/ai-functions/useAIFunction";
import { useAI } from "@/contexts/AIContext";
import { IconSunrise, IconArrowRight } from "@/components/icons";
import { MarkdownMessage } from "@/components/MarkdownMessage";

const FUNCTION_ID  = "morning-briefing";
const CACHE_KEY    = "eh-briefing-cache";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface BriefingCache { result: string; cachedAt: number }

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { result, cachedAt } = JSON.parse(raw) as BriefingCache;
    if (Date.now() - cachedAt > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY); return null; }
    return result;
  } catch { return null; }
}

function writeCache(result: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ result, cachedAt: Date.now() } satisfies BriefingCache)); }
  catch { /* storage full — ignore */ }
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export function BriefingWidget() {
  const { keyConfigured } = useAI();
  const { run, result, loading, error, reset } = useAIFunction();
  const hasAutoRun = useRef(false);
  const [cached, setCached] = useState<string | null>(null);

  // On mount: load cache first, only call AI if cache is stale/missing
  useEffect(() => {
    const hit = readCache();
    if (hit) {
      setCached(hit);
      return; // cache is fresh — no API call needed
    }
    if (keyConfigured && !hasAutoRun.current) {
      hasAutoRun.current = true;
      run(FUNCTION_ID);
    }
  }, [keyConfigured, run]);

  // When a fresh result arrives, persist it to cache
  useEffect(() => {
    if (result) { writeCache(result); setCached(result); }
  }, [result]);

  function handleRefresh() {
    clearCache();
    setCached(null);
    reset();
    run(FUNCTION_ID);
  }

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

  // ── Cached result (no loading needed) ─────────────────────────────────────
  if (cached && !loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-[var(--text-primary)]">
          <MarkdownMessage content={cached} />
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--active-text)] transition-colors"
        >
          <IconSunrise size={10} />
          Refresh briefing
        </button>
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
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <IconArrowRight size={11} />
          Try again
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
