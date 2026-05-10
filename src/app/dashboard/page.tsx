"use client";

import { apps } from "@/lib/apps";
import { useMsal } from "@azure/msal-react";
import AppTile from "@/components/AppTile";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { accounts } = useMsal();
  const name = accounts[0]?.name?.split(" ")[0] ?? "";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
          {getGreeting()}{name ? `, ${name}` : ""}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">All your enterprise apps in one place.</p>
      </div>

      <section>
        <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-4">
          Your Apps
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {apps.map((app) => (
            <AppTile key={app.id} app={app} />
          ))}
        </div>
      </section>
    </div>
  );
}
