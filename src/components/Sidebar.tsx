"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { apps } from "@/lib/apps";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "My Tasks",  href: "/dashboard/tasks",  icon: "✓" },
  { label: "Search",    href: "/dashboard/search",  icon: "⌕" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 text-sm rounded-md mb-0.5 transition-colors ${
      pathname === href
        ? "bg-[var(--active-bg)] text-[var(--active-text)] font-medium"
        : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col py-4 z-40 overflow-y-auto">
      <nav className="flex-1 px-2">

        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
          Workspace
        </p>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2 mt-5">
          Apps
        </p>
        {apps.map((app) => {
          const href = `/dashboard/apps/${app.id}`;
          const active = pathname === href;
          return (
            <Link key={app.id} href={href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md mb-0.5 transition-colors ${
                active
                  ? "bg-[var(--active-bg)] text-[var(--active-text)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white font-mono font-bold"
                style={{ backgroundColor: app.color, fontSize: "7px" }}
              >
                {app.icon}
              </span>
              <span className="truncate">{app.name}</span>
            </Link>
          );
        })}

        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2 mt-5">
          Admin
        </p>
        <Link href="/dashboard/admin" className={linkClass("/dashboard/admin")}>
          <span className="text-base leading-none">⚙</span>
          Admin Panel
        </Link>

      </nav>

      <div className="px-4 pt-4 border-t border-[var(--shell-border)] flex-shrink-0">
        <p className="font-mono text-[10px] text-[var(--text-muted)]">v0.1.0 — Private Beta</p>
      </div>
    </aside>
  );
}
