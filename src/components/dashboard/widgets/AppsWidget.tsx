"use client";

import Link from "next/link";
import { apps } from "@/lib/apps";
import AppIcon from "@/components/AppIcon";

/**
 * AppsWidget — a compact grid of all connected apps.
 * Data source: static apps.ts — no API, no storage.
 */
export function AppsWidget() {
  return (
    <div className="p-3 grid grid-cols-3 gap-2">
      {apps.map((app) => {
        const href = `/dashboard/apps/${app.id}`;
        return (
          <Link
            key={app.id}
            href={href}
            className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors text-center group"
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${app.color}18` }}
            >
              <AppIcon slug={app.logo} color={app.color} size={20} />
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] leading-tight line-clamp-2 transition-colors">
              {app.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
