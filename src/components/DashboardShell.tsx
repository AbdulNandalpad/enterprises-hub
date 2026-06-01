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

// Responsive left margin: on mobile always 0, on desktop follows sidebar mode
const SIDEBAR_ML: Record<string, string> = {
  expanded:  "ml-0 md:ml-56",
  icons:     "ml-0 md:ml-14",
  collapsed: "ml-0 md:ml-6",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { prefs } = useUIPrefs();
  const { config } = useAI();

  const aiDocked = config.enabled && config.panelPosition === "right";

  const ml = SIDEBAR_ML[prefs.sidebarMode] ?? "ml-0 md:ml-56";
  // Right margin for docked AI panel — only on desktop (panel is hidden on mobile)
  const mr = aiDocked ? "mr-0 md:mr-80" : "mr-0";

  // Density → explicit padding on the inner div (tighter on mobile)
  const pad = {
    compact:     "p-4 md:p-5",
    normal:      "p-4 md:p-8",
    comfortable: "p-4 md:p-12",
  }[prefs.density] ?? "p-4 md:p-8";

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
