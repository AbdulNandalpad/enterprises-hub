"use client";

import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardProvider } from "@/contexts/DashboardContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#C8341A] text-white font-mono text-[11px] tracking-widest uppercase">
      <span>⬡ Demo mode — internal use only</span>
      <button
        onClick={onExit}
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        Exit demo ✕
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { accounts } = useMsal();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check cookie presence; AuthGuard already validated the HMAC so any
    // eh-demo value here means a legitimate demo session.
    setIsDemoMode(
      document.cookie.split(";").some((c) => c.trim().startsWith("eh-demo="))
    );
  }, []);

  const handleExitDemo = () => {
    // Expire the signed demo cookie and return to login
    document.cookie = "eh-demo=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  };

  const name = isDemoMode
    ? "Demo"
    : (accounts[0]?.name?.split(" ")[0] ?? "");

  return (
    <DashboardProvider>
      {isDemoMode && <DemoBanner onExit={handleExitDemo} />}

      <div className="space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            {getGreeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {isDemoMode
              ? "This is a live demo environment — sample data, real interface."
              : "Build your daily at-a-glance view below. Data comes live — nothing stored."
            }
          </p>
        </div>

        {/* Customisable widget canvas */}
        <DashboardGrid />
      </div>
    </DashboardProvider>
  );
}
