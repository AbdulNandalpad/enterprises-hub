"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apps, logoUrl } from "@/lib/apps";

const navItems = [
  { label: "Dashboard", href: "/dashboard",        emoji: "🏠" },
  { label: "My Tasks",  href: "/dashboard/tasks",  emoji: "✅" },
  { label: "Search",    href: "/dashboard/search",  emoji: "🔍" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  const baseLink = "flex items-center gap-3 px-3 py-2 text-sm rounded-lg mb-0.5 transition-all duration-150";
  const activeLink = `${baseLink} bg-[var(--active-bg)] text-[var(--active-text)] font-medium`;
  const inactiveLink = `${baseLink} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col py-3 z-40 overflow-y-auto">
      <nav className="flex-1 px-2">

        {/* Workspace */}
        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
          Workspace
        </p>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? activeLink : inactiveLink}>
            <span className="text-base w-5 text-center">{item.emoji}</span>
            {item.label}
          </Link>
        ))}

        {/* Apps */}
        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2 mt-4">
          Apps
        </p>
        {apps.map((app) => {
          const href = `/dashboard/apps/${app.id}`;
          const active = isActive(href);
          return (
            <Link key={app.id} href={href} className={active ? activeLink : inactiveLink}>
              <span
                className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${app.color}20` }}
              >
                <Image
                  src={logoUrl(app.logo, app.color)}
                  alt={app.name}
                  width={13}
                  height={13}
                  className="object-contain"
                />
              </span>
              <span className="truncate">{app.name}</span>
            </Link>
          );
        })}

        {/* Admin */}
        <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2 mt-4">
          Admin
        </p>
        <Link href="/dashboard/admin" className={isActive("/dashboard/admin") ? activeLink : inactiveLink}>
          <span className="text-base w-5 text-center">⚙️</span>
          Admin Panel
        </Link>

      </nav>

      <div className="px-4 pt-3 border-t border-[var(--shell-border)] flex-shrink-0">
        <p className="font-mono text-[10px] text-[var(--text-muted)]">v0.1.0 — Private Beta</p>
      </div>
    </aside>
  );
}
