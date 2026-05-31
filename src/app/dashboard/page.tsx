"use client";

import { useMsal } from "@azure/msal-react";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardProvider } from "@/contexts/DashboardContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { accounts } = useMsal();
  const name = accounts[0]?.name?.split(" ")[0] ?? "";

  return (
    <DashboardProvider>
      <div className="space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            {getGreeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Build your daily at-a-glance view below. Data comes live — nothing stored.
          </p>
        </div>

        {/* Customisable widget canvas */}
        <DashboardGrid />

      </div>
    </DashboardProvider>
  );
}
