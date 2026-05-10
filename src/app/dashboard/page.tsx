"use client";

import Link from "next/link";
import { apps } from "@/lib/apps";
import { useMsal } from "@azure/msal-react";

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
        <h1 className="text-3xl font-black text-[var(--ink)] mb-1">
          {getGreeting()}{name ? `, ${name}` : ""}
        </h1>
        <p className="text-[var(--ink4)] text-sm font-light">All your enterprise apps in one place.</p>
      </div>

      <section>
        <p className="font-mono text-[11px] font-medium text-[var(--ink4)] tracking-widest uppercase mb-4">
          Your Apps
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className="group bg-white border border-[var(--rule)] p-5 hover:border-[var(--ink3)] hover:shadow-sm transition-all"
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-white font-mono font-semibold text-sm mb-3"
                style={{ backgroundColor: app.color }}
              >
                {app.icon}
              </div>
              <p className="text-sm font-medium text-[var(--ink)]">{app.name}</p>
              <p className="font-mono text-[10px] text-[var(--ink4)] tracking-wide uppercase mt-0.5">{app.category}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
