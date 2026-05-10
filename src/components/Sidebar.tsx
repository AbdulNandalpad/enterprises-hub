"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "My Apps", href: "/dashboard/apps", icon: "⊡" },
  { label: "My Tasks", href: "/dashboard/tasks", icon: "✓" },
  { label: "Search", href: "/dashboard/search", icon: "⌕" },
];

const adminItems = [
  { label: "Admin Panel", href: "/dashboard/admin", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-[--rule] flex flex-col py-4 z-40">
      <nav className="flex-1 px-2">
        <p className="font-mono text-[10px] font-semibold text-[--ink4] tracking-widest uppercase px-3 py-2">
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
                  ? "bg-[--paper2] text-[--ink] font-medium"
                  : "text-[--ink3] hover:bg-[--paper2] hover:text-[--ink]"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <p className="font-mono text-[10px] font-semibold text-[--ink4] tracking-widest uppercase px-3 py-2 mt-4">
          Admin
        </p>
        {adminItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-sm mb-0.5 transition-colors ${
                active
                  ? "bg-[--paper2] text-[--ink] font-medium"
                  : "text-[--ink3] hover:bg-[--paper2] hover:text-[--ink]"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pt-4 border-t border-[var(--rule)]">
        <p className="font-mono text-[10px] text-[var(--ink4)]">v0.1.0 — Private Beta</p>
      </div>
    </aside>
  );
}
