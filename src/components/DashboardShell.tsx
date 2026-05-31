"use client";

/**
 * DashboardShell — client-side layout wrapper.
 *
 * Reads UIPrefsContext + AIContext to compute:
 *   - Left margin  (sidebar width)
 *   - Right margin (info panel + AI panel when docked)
 *   - Content padding (density)
 *   - data-density attribute for CSS overrides
 *
 * Also renders the right-side info panel and the AI panel.
 */

import type { ReactNode } from "react";
import { useUIPrefs } from "@/contexts/UIPrefsContext";
import { useAI } from "@/contexts/AIContext";
import dynamic from "next/dynamic";

// Lazy-load the heavy AI panel — only pulled in when AI is enabled
const AIPanel = dynamic(() => import("@/components/ai/AIPanel"), { ssr: false });

const SIDEBAR_ML: Record<string, string> = {
  expanded:  "ml-56",
  icons:     "ml-14",
  collapsed: "ml-6",   // collapsed strip is w-6, so we still offset by that
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { prefs } = useUIPrefs();
  const { config } = useAI();

  const aiDocked = config.enabled && config.panelPosition === "right";

  const ml = SIDEBAR_ML[prefs.sidebarMode] ?? "ml-56";
  const mr = aiDocked ? "mr-80" : "mr-0";

  // Density → explicit padding on the inner div
  const pad = { compact: "p-5", normal: "p-8", comfortable: "p-12" }[prefs.density] ?? "p-8";

  return (
    <>
      {/* ── Main content area ─────────────────────────────────────────── */}
      <main
        className={`${ml} ${mr} pt-14 min-h-screen transition-[margin] duration-200 ease-in-out`}
        data-density={prefs.density}
      >
        <div className={pad}>{children}</div>
      </main>

      {/* ── AI chat panel ─────────────────────────────────────────────── */}
      {config.enabled && <AIPanel />}
    </>
  );
}
