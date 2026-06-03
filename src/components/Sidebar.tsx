"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AppIcon from "./AppIcon";
import { useUIPrefs } from "@/contexts/UIPrefsContext";
import { useApps } from "@/contexts/AppsContext";
import { useRoles } from "@/contexts/RolesContext";
import {
  IconHome, IconCheckSquare, IconSearch, IconSliders, IconArrowRight,
  IconBarChart,
  type IconComponent,
} from "@/components/icons";

// ─── Connector-derived app entries ───────────────────────────────────────────

interface ConnectorEntry {
  id:    string;
  name:  string;   // "Salesforce · Production"
  url:   string;
  color: string;
  logo:  string;   // AppIcon slug
}

const CONNECTOR_META: Record<string, { label: string; color: string; logo: string }> = {
  salesforce:      { label: "Salesforce",      color: "#00A1E0", logo: "salesforce" },
  sap_sales_cloud: { label: "SAP Sales Cloud", color: "#0070F3", logo: "sap"        },
  sap_s4hana:      { label: "SAP S/4HANA",     color: "#0070F3", logo: "sap"        },
};

function useConnectorEntries(): ConnectorEntry[] {
  const [entries, setEntries] = useState<ConnectorEntry[]>([]);

  useEffect(() => {
    fetch("/api/admin/connectors")
      .then((r) => (r.ok ? r.json() : []))
      .then((configs: Array<{ id: string; connector_type: string; label: string; instance_url: string; is_active: boolean }>) => {
        if (!Array.isArray(configs)) return;
        const mapped = configs
          .filter((c) => c.is_active && CONNECTOR_META[c.connector_type])
          .map((c) => {
            const meta = CONNECTOR_META[c.connector_type];
            return {
              id:    c.id,
              name:  `${meta.label} · ${c.label}`,   // "Salesforce · Production"
              url:   c.instance_url,
              color: meta.color,
              logo:  meta.logo,
            };
          });
        setEntries(mapped);
      })
      .catch(() => {});
  }, []);

  return entries;
}

const navItems: { label: string; href: string; Icon: IconComponent }[] = [
  { label: "Dashboard", href: "/dashboard",          Icon: IconHome },
  { label: "My Tasks",  href: "/dashboard/tasks",    Icon: IconCheckSquare },
  { label: "Reports",   href: "/dashboard/reports",  Icon: IconBarChart },
  { label: "Search",    href: "/dashboard/search",   Icon: IconSearch },
  { label: "Settings",  href: "/dashboard/settings", Icon: IconSliders },
];

// ─── Shared active/inactive class builders ────────────────────────────────────

function expandedUserCls(pathname: string, href: string) {
  const base = "flex items-center gap-3 px-3 py-2 text-sm rounded-lg mb-0.5 transition-all duration-150";
  return pathname === href
    ? `${base} font-medium bg-[var(--active-bg)] text-[var(--active-text)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

function iconsUserCls(pathname: string, href: string) {
  const base = "flex items-center justify-center w-10 h-9 rounded-lg mb-0.5 mx-auto transition-all duration-150";
  return pathname === href
    ? `${base} bg-[var(--active-bg)] text-[var(--active-text)]`
    : `${base} text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]`;
}

// ─── Sidebar body — shared between expanded, icons, and collapsed overlay ─────

function SidebarContent({ mode, connectorEntries }: { mode: "expanded" | "icons"; connectorEntries: ConnectorEntry[] }) {
  const pathname  = usePathname();
  const isIcons   = mode === "icons";
  const { enabledApps } = useApps();
  const { canSeeSearch } = useRoles();

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/dashboard/search" && !canSeeSearch) return false;
    return true;
  });

  return (
    <>
      {/* Main nav */}
      <div className="px-2 pt-3 flex-shrink-0">
        {!isIcons && (
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
            Workspace
          </p>
        )}
        {isIcons && <div className="border-t border-[var(--shell-border)] mx-2 mb-2 mt-1" />}
        {visibleNavItems.map((item) => (
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

      {/* App tiles */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {!isIcons && (
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 py-2">
            Apps
          </p>
        )}
        {isIcons && <div className="border-t border-[var(--shell-border)] mx-2 mb-2" />}

        {/* Static apps (Teams, IONOS webmail, Jira, etc.) */}
        {enabledApps.map((app) => (
          <a
            key={app.id}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            title={app.name}
            className={isIcons ? iconsUserCls(pathname, "") : expandedUserCls(pathname, "")}
          >
            <span
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${app.color}18` }}
            >
              <AppIcon slug={app.logo} color={app.color} size={13} />
            </span>
            {!isIcons && <span className="truncate">{app.name}</span>}
          </a>
        ))}

        {/* Connector-based entries — Salesforce / SAP with instance labels */}
        {connectorEntries.map((entry) => (
          <a
            key={entry.id}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            title={entry.name}
            className={isIcons ? iconsUserCls(pathname, "") : expandedUserCls(pathname, "")}
          >
            <span
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${entry.color}18` }}
            >
              <AppIcon slug={entry.logo} color={entry.color} size={13} />
            </span>
            {!isIcons && <span className="truncate">{entry.name}</span>}
          </a>
        ))}
      </div>
    </>
  );
}

// ─── Main Sidebar export ──────────────────────────────────────────────────────

export default function Sidebar() {
  const { prefs, mobileSidebarOpen, setMobileSidebarOpen } = useUIPrefs();
  const mode = prefs.sidebarMode;
  const [overlayOpen, setOverlayOpen] = useState(false);
  // Fetch connector configs once — passed into all SidebarContent instances
  const connectorEntries = useConnectorEntries();

  // ── Mobile overlay (always, regardless of sidebarMode pref) ──────────────
  // Rendered as a portal-style overlay at md: breakpoint and below.
  // The desktop sidebar is hidden on mobile via `hidden md:flex` / `hidden md:block`.

  // ── Collapsed mode — just a thin trigger strip ────────────────────────────
  if (mode === "collapsed") {
    return (
      <>
        {/* Thin trigger strip — desktop only */}
        <button
          onClick={() => setOverlayOpen(true)}
          aria-label="Open sidebar"
          className="hidden md:flex fixed top-14 left-0 bottom-0 w-6 z-40 items-center justify-center bg-[var(--shell-surface)] border-r border-[var(--shell-border)] hover:bg-[var(--hover-bg)] transition-colors"
        >
          <IconArrowRight size={11} className="text-[var(--text-muted)]" />
        </button>

        {/* Desktop overlay */}
        {overlayOpen && (
          <>
            <div className="hidden md:block fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={() => setOverlayOpen(false)} />
            <aside className="hidden md:flex fixed top-14 left-0 bottom-0 w-56 z-50 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex-col shadow-xl">
              <SidebarContent mode="expanded" connectorEntries={connectorEntries} />
              <BottomBar />
            </aside>
          </>
        )}

        {/* Mobile overlay (hamburger-triggered) */}
        {mobileSidebarOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col shadow-xl">
              <SidebarContent mode="expanded" connectorEntries={connectorEntries} />
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
      <>
        <aside className="hidden md:flex fixed top-14 left-0 bottom-0 w-14 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex-col z-40">
          <SidebarContent mode="icons" connectorEntries={connectorEntries} />
          <div className="px-2 py-3 border-t border-[var(--shell-border)] flex-shrink-0 flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col shadow-xl">
              <SidebarContent mode="expanded" connectorEntries={connectorEntries} />
              <BottomBar />
            </aside>
          </>
        )}
      </>
    );
  }

  // ── Expanded mode (default) ───────────────────────────────────────────────
  return (
    <>
      <aside className="hidden md:flex fixed top-14 left-0 bottom-0 w-56 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex-col z-40">
        <SidebarContent mode="expanded" connectorEntries={connectorEntries} />
        <BottomBar />
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 z-50 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] flex flex-col shadow-xl">
            <SidebarContent mode="expanded" connectorEntries={connectorEntries} />
            <BottomBar />
          </aside>
        </>
      )}
    </>
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
