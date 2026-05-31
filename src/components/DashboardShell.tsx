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
import RightPanel from "@/components/RightPanel";
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
  // When the AI panel is docked right, the info panel is replaced by it
  const showInfoPanel = prefs.rightPanelVisible && !aiDocked;

  const ml  = SIDEBAR_ML[prefs.sidebarMode] ?? "ml-56";
  const mr  = aiDocked ? "mr-80" : showInfoPanel ? "mr-72" : "mr-0";

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

      {/* ── Info panel (tasks / meetings / pinned apps) ────────────────── */}
      {showInfoPanel && (
        <aside className="fixed top-14 right-0 bottom-0 w-72 bg-[var(--shell-bg)] border-l border-[var(--shell-border)] overflow-y-auto z-30">
          <div className="p-4">
            <RightPanel />
          </div>
        </aside>
      )}

      {/* ── AI chat panel ─────────────────────────────────────────────── */}
      {config.enabled && <AIPanel />}
    </>
  );
}
