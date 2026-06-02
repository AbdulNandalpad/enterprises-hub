"use client";

import { useState, useEffect } from "react";
import { useRoles } from "@/contexts/RolesContext";

// ── Personal settings components ──────────────────────────────────────────────
import { AppearanceSettings }  from "@/components/settings/AppearanceSettings";
import { AISettings }          from "@/components/settings/AISettings";
import { LabelsSettings }      from "@/components/settings/LabelsSettings";
import { ConnectorsSettings }  from "@/components/settings/ConnectorsSettings";
import { AppsSettings }        from "@/components/settings/AppsSettings";

// ── Admin / workspace components ──────────────────────────────────────────────
import AdminOverview    from "@/components/admin/AdminOverview";
import AdminConnectors  from "@/components/admin/AdminConnectors";
import AdminRoles       from "@/components/admin/AdminRoles";
import AdminBranding    from "@/components/admin/AdminBranding";
import AdminAudit       from "@/components/admin/AdminAudit";
import AdminGovernance  from "@/components/admin/AdminGovernance";
import AdminAuth        from "@/components/admin/AdminAuth";

// ── Icons ─────────────────────────────────────────────────────────────────────
import {
  IconSliders, IconSparkle, IconPencil, IconPlug, IconGrid,
  IconBarChart, IconUsers, IconPaintbrush, IconLock,
  IconTrendingUp, IconShield,
  type IconComponent,
} from "@/components/icons";

// ── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  id:       string;
  label:    string;
  Icon:     IconComponent;
  desc:     string;
  adminOnly?: boolean;  // only admins + managers see this
  superAdmin?: boolean; // only admins see this
}

const ALL_TABS: TabDef[] = [
  // ── Personal ──────────────────────────────────────────────────────────────
  { id: "appearance",   label: "Appearance",   Icon: IconSliders,     desc: "Theme & sidebar"         },
  { id: "apps",         label: "Apps",         Icon: IconGrid,        desc: "App shortcuts"           },
  { id: "connections",  label: "My Connections", Icon: IconPlug,      desc: "Email, Teams & calendar" },
  { id: "ai",           label: "AI",           Icon: IconSparkle,     desc: "Model & AI panel"        },
  { id: "labels",       label: "Labels",       Icon: IconPencil,      desc: "Rename labels"           },

  // ── Workspace (admin / manager) ───────────────────────────────────────────
  { id: "overview",     label: "Overview",     Icon: IconBarChart,    desc: "Workspace stats",     adminOnly: true  },
  { id: "integrations", label: "Integrations", Icon: IconPlug,        desc: "Salesforce, SAP & more", adminOnly: true },
  { id: "users",        label: "Users & Roles", Icon: IconUsers,      desc: "Team members & access", adminOnly: true  },
  { id: "branding",     label: "Branding",     Icon: IconPaintbrush,  desc: "Logo, colors & domain", superAdmin: true },
  { id: "auth",         label: "Auth & SSO",   Icon: IconLock,        desc: "SAML & identity",     superAdmin: true },
  { id: "audit",        label: "Audit",        Icon: IconTrendingUp,  desc: "Event history",        adminOnly: true  },
  { id: "governance",   label: "AI Governance", Icon: IconShield,     desc: "AI policy & review",  superAdmin: true },
];

// ── Component map ─────────────────────────────────────────────────────────────

function TabContent({ id }: { id: string }) {
  switch (id) {
    case "appearance":   return <AppearanceSettings />;
    case "apps":         return <AppsSettings />;
    case "connections":  return <ConnectorsSettings />;
    case "ai":           return <AISettings />;
    case "labels":       return <LabelsSettings />;
    case "overview":     return <AdminOverview />;
    case "integrations": return <AdminConnectors />;
    case "users":        return <AdminRoles />;
    case "branding":     return <AdminBranding />;
    case "auth":         return <AdminAuth />;
    case "audit":        return <AdminAudit />;
    case "governance":   return <AdminGovernance />;
    default:             return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isAdmin, isManager, loading } = useRoles();
  const [activeTab, setActiveTab] = useState("appearance");

  // Compute visible tabs based on role
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.superAdmin) return isAdmin;
    if (t.adminOnly)  return isAdmin || isManager;
    return true;
  });

  // If current tab becomes hidden after roles load, reset to first
  useEffect(() => {
    if (!loading && !visibleTabs.find((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "appearance");
    }
  }, [loading, visibleTabs, activeTab]);

  // Split tabs into two groups for the two-column sidebar layout
  const personalTabs = visibleTabs.filter((t) => !t.adminOnly && !t.superAdmin);
  const workspaceTabs = visibleTabs.filter((t) => t.adminOnly || t.superAdmin);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">

      {/* ── Left sidebar nav ─────────────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 border-r border-[var(--shell-border)] pt-6 pb-4 px-3 flex flex-col gap-5">

        {/* Personal group */}
        <div>
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-2 mb-1">
            Personal
          </p>
          {loading
            ? [1,2,3].map((i) => <div key={i} className="h-8 rounded-lg bg-[var(--shell-border)] animate-pulse mb-1" />)
            : personalTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors mb-0.5 ${
                    activeTab === tab.id
                      ? "bg-[var(--active-bg)] text-[var(--active-text)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <tab.Icon size={14} className="flex-shrink-0" />
                  {tab.label}
                </button>
              ))
          }
        </div>

        {/* Workspace group — only shown if user has admin/manager role */}
        {!loading && workspaceTabs.length > 0 && (
          <div>
            <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-2 mb-1">
              Workspace
            </p>
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left text-sm transition-colors mb-0.5 ${
                  activeTab === tab.id
                    ? "bg-[var(--admin-bg)] text-[var(--admin)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                }`}
              >
                <tab.Icon size={14} className="flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded bg-[var(--shell-border)]" />
            <div className="h-4 w-72 rounded bg-[var(--shell-border)]" />
            <div className="h-40 rounded-xl bg-[var(--shell-border)]" />
          </div>
        ) : (
          <TabContent id={activeTab} />
        )}
      </main>

    </div>
  );
}
