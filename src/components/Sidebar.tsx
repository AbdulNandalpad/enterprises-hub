"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { apps } from "@/lib/apps";
import AppIcon from "./AppIcon";

const navItems = [
  { label: "Dashboard", href: "/dashboard",       emoji: "🏠" },
  { label: "My Tasks",  href: "/dashboard/tasks", emoji: "✅" },
  { label: "Search",    href: "/dashboard/search", emoji: "🔍" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const base = "flex items-center gap-3 px-3 py-2 text-sm rounded-lg mb-0.5 transition-all duration-150";
  const active = `${base} bg-[var(--active-bg)] text-[var(--active-text)] font-medium`;
  const inactive = `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
  const cls = (href: string) => pathname === href ? active : inactive;

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col z-40">

      {/* Sticky top section — always visible */}
      <div className="px-2 pt-3 flex-shrink-0">
        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
          Workspace
        </p>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cls(item.href)}>
            <span className="text-base w-5 text-center">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Scrollable apps section */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
          Apps
        </p>
        {apps.map((app) => {
          const href = `/dashboard/apps/${app.id}`;
          const isActive = pathname === href;
          return (
            <Link key={app.id} href={href} className={isActive ? active : inactive}>
              <span
                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${app.color}18` }}
              >
                <AppIcon slug={app.logo} color={app.color} size={13} />
              </span>
              <span className="truncate">{app.name}</span>
            </Link>
          );
        })}

        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2 mt-4">
          Admin
        </p>
        <Link href="/dashboard/admin" className={cls("/dashboard/admin")}>
          <span className="text-base w-5 text-center">⚙️</span>
          Admin Panel
        </Link>
      </div>

      {/* Bottom — always visible */}
      <div className="px-4 py-3 border-t border-[var(--shell-border)] flex-shrink-0 bg-[var(--shell-surface)]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="font-mono text-[10px] text-[var(--text-muted)]">v0.1.0 — Private Beta</p>
        </div>
      </div>
    </aside>
  );
}
