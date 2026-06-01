"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AppIcon from "./AppIcon";
import { useUIPrefs } from "@/contexts/UIPrefsContext";
import { useApps } from "@/contexts/AppsContext";
import {
  IconHome, IconCheckSquare, IconSearch,
  IconBarChart, IconPlug, IconWrench, IconShoppingBag,
  IconUsers, IconPaintbrush, IconLock, IconTrendingUp,
  IconShield, IconBookOpen, IconArrowRight,
  type IconComponent,
} from "@/components/icons";

const navItems: { label: string; href: string; Icon: IconComponent }[] = [
  { label: "Dashboard", href: "/dashboard",       Icon: IconHome },
  { label: "My Tasks",  href: "/dashboard/tasks", Icon: IconCheckSquare },
  { label: "Search",    href: "/dashboard/search", Icon: IconSearch },
];

const adminNavItems: { label: string; href: string; Icon: IconComponent }[] = [
  { label: "Overview",           href: "/dashboard/admin/overview",    Icon: IconBarChart },
  { label: "Connector Registry", href: "/dashboard/admin/connectors",  Icon: IconPlug },
  { label: "Connector Builder",  href: "/dashboard/admin/builder",     Icon: IconWrench },
  { label: "Marketplace",        href: "/dashboard/admin/marketplace", Icon: IconShoppingBag },
  { label: "Users & Roles",      href: "/dashboard/admin/roles",       Icon: IconUsers },
  { label: "Branding",           href: "/dashboard/admin/branding",    Icon: IconPaintbrush },
  { label: "Auth & SSO",         href: "/dashboard/admin/auth",        Icon: IconLock },
  { label: "Audit & Analytics",  href: "/dashboard/admin/audit",       Icon: IconTrendingUp },
  { label: "AI Governance",      href: "/dashboard/admin/governance",  Icon: IconShield },
  { label: "SDK & API Docs",     href: "/dashboard/admin/sdk",         Icon: IconBookOpen },
];

// ─── Shared active/inactive class builders ────────────────────────────────────

function expandedUserCls(pathname: string, href: string) {
  const base = "flex items-center gap-3 px-3 py-2 text-sm rounded-lg mb-0.5 transition-all duration-150";
  return pathname === href
    ? `${base} font-medium bg-[var(--active-bg)] text-[var(--active-text)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

function expandedAdminCls(pathname: string, href: string) {
  const base = "flex items-center gap-3 px-3 py-2 text-sm rounded-lg mb-0.5 transition-all duration-150";
  return pathname === href || pathname.startsWith(href + "/")
    ? `${base} font-medium bg-[var(--admin-bg)] text-[var(--admin)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

function iconsUserCls(pathname: string, href: string) {
  const base = "flex items-center justify-center w-10 h-9 rounded-lg mb-0.5 mx-auto transition-all duration-150";
  return pathname === href
    ? `${base} bg-[var(--active-bg)] text-[var(--active-text)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

function iconsAdminCls(pathname: string, href: string) {
  const base = "flex items-center justify-center w-10 h-9 rounded-lg mb-0.5 mx-auto transition-all duration-150";
  return pathname === href || pathname.startsWith(href + "/")
    ? `${base} bg-[var(--admin-bg)] text-[var(--admin)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

// ─── Sidebar body — shared between expanded, icons, and collapsed overlay ─────

function SidebarContent({ mode }: { mode: "expanded" | "icons" }) {
  const pathname = usePathname();
  const isAdminMode = pathname.startsWith("/dashboard/admin");
  const isIcons = mode === "icons";
  const { enabledApps } = useApps();

  if (isAdminMode) {
    return (
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2">
        {!isIcons && (
          <p
            className="font-mono text-[10px] font-semibold tracking-widest uppercase px-3 py-2"
            style={{ color: "var(--admin)" }}
          >
            Admin Console
          </p>
        )}
        {isIcons && <div className="border-t border-[var(--admin-border)] mx-2 mb-2" />}
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={isIcons ? item.label : undefined}
            className={isIcons ? iconsAdminCls(pathname, item.href) : expandedAdminCls(pathname, item.href)}
          >
            <item.Icon size={15} className={isIcons ? "" : "flex-shrink-0 w-5"} />
            {!isIcons && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={`${isIcons ? "px-2" : "px-2"} pt-3 flex-shrink-0`}>
        {!isIcons && (
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
            Workspace
          </p>
        )}
        {isIcons && <div className="border-t border-[var(--shell-border)] mx-2 mb-2 mt-1" />}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={isIcons ? item.label : undefined}
            className={isIcons ? iconsUserCls(pathname, item.href) : expandedUserCls(pathname, item.href)}
          >
            <item.Icon size={15} className={isIcons ? "" : "flex-shrink-0 w-5"} />
            {!isIcons && item.label}
          </Link>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {!isIcons && (
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
            Apps
          </p>
        )}
        {isIcons && <div className="border-t border-[var(--shell-border)] mx-2 mb-2" />}
        {enabledApps.map((app) => {
          const href = `/dashboard/apps/${app.id}`;
          return (
            <Link
              key={app.id}
              href={href}
              title={isIcons ? app.name : undefined}
              className={isIcons ? iconsUserCls(pathname, href) : expandedUserCls(pathname, href)}
            >
              <span
                className={`${isIcons ? "w-5 h-5" : "w-5 h-5"} rounded-md flex-shrink-0 flex items-center justify-center`}
                style={{ backgroundColor: `${app.color}18` }}
              >
                <AppIcon slug={app.logo} color={app.color} size={13} />
              </span>
              {!isIcons && <span className="truncate">{app.name}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Sidebar export ──────────────────────────────────────────────────────

export default function Sidebar() {
  const { prefs } = useUIPrefs();
  const mode = prefs.sidebarMode;
  const [overlayOpen, setOverlayOpen] = useState(false);

  // ── Collapsed mode — just a thin trigger strip ────────────────────────────
  if (mode === "collapsed") {
    return (
      <>
        {/* Thin trigger strip */}
        <button
          onClick={() => setOverlayOpen(true)}
          aria-label="Open sidebar"
          className="fixed top-14 left-0 bottom-0 w-6 z-40 flex items-center justify-center bg-[var(--shell-surface)] border-r border-[var(--shell-border)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <IconArrowRight size={11} className="text-[var(--text-muted)]" />
        </button>

        {/* Overlay */}
        {overlayOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
              onClick={() => setOverlayOpen(false)}
            />
            {/* Sidebar as overlay */}
            <aside className="fixed top-14 left-0 bottom-0 w-56 z-50 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col shadow-xl">
              <SidebarContent mode="expanded" />
              <BottomBar />
            </aside>
          </>
        )}
      </>
    );
  }

  // ── Icons mode ────────────────────────────────────────────────────────────
  if (mode === "icons") {
    return (
      <aside className="fixed top-14 left-0 bottom-0 w-14 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col z-40">
        <SidebarContent mode="icons" />
        <div className="px-2 py-3 border-t border-[var(--shell-border)] flex-shrink-0 flex justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </aside>
    );
  }

  // ── Expanded mode (default) ───────────────────────────────────────────────
  return (
    <aside className="fixed top-14 left-0 bottom-0 w-56 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col z-40">
      <SidebarContent mode="expanded" />
      <BottomBar />
    </aside>
  );
}

function BottomBar() {
  return (
    <div className="px-4 py-3 border-t border-[var(--shell-border)] flex-shrink-0 bg-[var(--shell-surface)]">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <p className="font-mono text-[10px] text-[var(--text-muted)]">v0.1.0 — Private Beta</p>
      </div>
    </div>
  );
}
