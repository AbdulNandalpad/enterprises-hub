"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { apps } from "@/lib/apps";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "My Tasks", href: "/dashboard/tasks", icon: "✓" },
  { label: "Search", href: "/dashboard/search", icon: "⌕" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-[var(--rule)] flex flex-col py-4 z-40 overflow-y-auto">
      <nav className="flex-1 px-2">
        {/* Main nav */}
        <p className="font-mono text-[10px] font-semibold text-[var(--ink4)] tracking-widest uppercase px-3 py-2">
          Workspace
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-sm mb-0.5 transition-colors ${
                active
                  ? "bg-[var(--paper2)] text-[var(--ink)] font-medium"
                  : "text-[var(--ink3)] hover:bg-[var(--paper2)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Apps list */}
        <p className="font-mono text-[10px] font-semibold text-[var(--ink4)] tracking-widest uppercase px-3 py-2 mt-4">
          Apps
        </p>
        {apps.map((app) => {
          const active = pathname === `/dashboard/apps/${app.id}`;
          return (
            <Link
              key={app.id}
              href={`/dashboard/apps/${app.id}`}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-sm mb-0.5 transition-colors ${
                active
                  ? "bg-[var(--paper2)] text-[var(--ink)] font-medium"
                  : "text-[var(--ink3)] hover:bg-[var(--paper2)] hover:text-[var(--ink)]"
              }`}
            >
              <span
                className="w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center text-white font-mono font-bold"
                style={{ backgroundColor: app.color, fontSize: "7px" }}
              >
                {app.icon}
              </span>
              <span className="truncate">{app.name}</span>
            </Link>
          );
        })}

        {/* Admin */}
        <p className="font-mono text-[10px] font-semibold text-[var(--ink4)] tracking-widest uppercase px-3 py-2 mt-4">
          Admin
        </p>
        <Link
          href="/dashboard/admin"
          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-sm mb-0.5 transition-colors ${
            pathname === "/dashboard/admin"
              ? "bg-[var(--paper2)] text-[var(--ink)] font-medium"
              : "text-[var(--ink3)] hover:bg-[var(--paper2)] hover:text-[var(--ink)]"
          }`}
        >
          <span className="text-base leading-none">⚙</span>
          Admin Panel
        </Link>
      </nav>

      <div className="px-4 pt-4 border-t border-[var(--rule)] flex-shrink-0">
        <p className="font-mono text-[10px] text-[var(--ink4)]">v0.1.0 — Private Beta</p>
      </div>
    </aside>
  );
}
