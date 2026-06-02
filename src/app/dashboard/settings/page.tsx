"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoles } from "@/contexts/RolesContext";

// ── Personal settings components ──────────────────────────────────────────────
import { AppearanceSettings }   from "@/components/settings/AppearanceSettings";
import { AISettings }           from "@/components/settings/AISettings";
import { LabelsSettings }       from "@/components/settings/LabelsSettings";
import { AppsSettings }         from "@/components/settings/AppsSettings";
import { ConnectorsSettings }   from "@/components/settings/ConnectorsSettings";

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
  IconSliders, IconSparkle, IconPencil, IconGrid,
  IconBarChart, IconUsers, IconPaintbrush, IconLock,
  IconTrendingUp, IconShield, IconPlug, IconX, IconLink,
  type IconComponent,
} from "@/components/icons";

// ── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  id:         string;
  label:      string;
  Icon:       IconComponent;
  desc:       string;
  adminOnly?: boolean;   // admins + managers
  superAdmin?: boolean;  // admins only
}

const ALL_TABS: TabDef[] = [
  // ── Personal ──────────────────────────────────────────────────────────────
  { id: "appearance",   label: "Appearance",    Icon: IconSliders,     desc: "Theme & sidebar"          },
  { id: "apps",         label: "Apps",          Icon: IconGrid,        desc: "App shortcuts"            },
  { id: "connections",  label: "Connections",   Icon: IconLink,        desc: "Email, calendar & Teams"  },
  { id: "ai",           label: "AI",            Icon: IconSparkle,     desc: "Model & AI panel"         },
  { id: "labels",       label: "Labels",        Icon: IconPencil,      desc: "Rename labels"            },

  // ── Workspace ─────────────────────────────────────────────────────────────
  { id: "overview",     label: "Overview",      Icon: IconBarChart,    desc: "Workspace stats",      adminOnly: true  },
  { id: "integrations", label: "Integrations",  Icon: IconPlug,        desc: "Salesforce, SAP & more", adminOnly: true },
  { id: "users",        label: "Users & Roles", Icon: IconUsers,       desc: "Team members & access", adminOnly: true  },
  { id: "branding",     label: "Branding",      Icon: IconPaintbrush,  desc: "Logo, colors & domain", superAdmin: true },
  { id: "auth",         label: "Auth & SSO",    Icon: IconLock,        desc: "SAML & identity",      superAdmin: true },
  { id: "audit",        label: "Audit",         Icon: IconTrendingUp,  desc: "Event history",         adminOnly: true  },
  { id: "governance",   label: "AI Governance", Icon: IconShield,      desc: "AI policy & review",   superAdmin: true },
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
  const router = useRouter();
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

  // Split into two sidebar groups
  const personalTabs  = visibleTabs.filter((t) => !t.adminOnly && !t.superAdmin);
  const workspaceTabs = visibleTabs.filter((t) =>  t.adminOnly ||  t.superAdmin);

  return (
    /*
     * Fixed overlay — sits directly under the topbar (top-14), covers the
     * full viewport. Ignores sidebar margins and AI panel margins entirely.
     */
    <div className="fixed top-14 left-0 right-0 bottom-0 z-40 flex bg-[var(--shell-bg)] overflow-hidden">

      {/* ── Left sidebar nav ─────────────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 border-r border-[var(--shell-border)] flex flex-col bg-[var(--shell-surface)] overflow-y-auto">

        {/* Header row inside sidebar */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-[var(--shell-border)] flex-shrink-0">
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)] tracking-wide">Settings</span>
          <button
            onClick={() => router.back()}
            aria-label="Close settings"
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <IconX size={13} />
          </button>
        </div>

        <div className="flex-1 px-2 py-3 space-y-4">

          {/* Personal group */}
          <div>
            <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-2 mb-1">
              Personal
            </p>
            {loading
              ? [1,2,3].map((i) => (
                  <div key={i} className="h-8 rounded-lg bg-[var(--shell-border)] animate-pulse mb-1" />
                ))
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

          {/* Workspace group */}
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

        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-48 rounded bg-[var(--shell-border)]" />
              <div className="h-4 w-72 rounded bg-[var(--shell-border)]" />
              <div className="h-40 rounded-xl bg-[var(--shell-border)]" />
            </div>
          ) : (
            <TabContent id={activeTab} />
          )}
        </div>
      </main>

    </div>
  );
}
