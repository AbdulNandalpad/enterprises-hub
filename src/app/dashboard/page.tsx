"use client";

import { apps } from "@/lib/apps";
import { useMsal } from "@azure/msal-react";
import AppTile from "@/components/AppTile";
import RightPanel from "@/components/RightPanel";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const pinnedIds = ["sap-c4c", "teams", "jira", "power-bi"];
const pinnedApps = apps.filter((a) => pinnedIds.includes(a.id));
const otherApps = apps.filter((a) => !pinnedIds.includes(a.id));

export default function DashboardPage() {
  const { accounts } = useMsal();
  const name = accounts[0]?.name?.split(" ")[0] ?? "";

  return (
    <div className="flex gap-6 h-full">

      {/* Left — main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
            {getGreeting()}{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Your workspace is ready. {apps.length} apps connected.
          </p>
        </div>

        {/* Pinned apps */}
        <div className="mb-8">
          <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
            Pinned Apps
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {pinnedApps.map((app) => (
              <AppTile key={app.id} app={app} />
            ))}
          </div>
        </div>

        {/* Other apps */}
        {otherApps.length > 0 && (
          <div>
            <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-3">
              More Apps
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {otherApps.map((app) => (
                <AppTile key={app.id} app={app} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0">
        <RightPanel />
      </div>

    </div>
  );
}
