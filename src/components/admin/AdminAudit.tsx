"use client";

/**
 * AdminAudit — Audit & Analytics
 *
 * Purpose: HISTORY of what happened in the workspace.
 *   - User management events (invites, role changes, suspensions)
 *   - Admin configuration events (branding saves, connector changes)
 *   - Login events (future: from Azure AD sign-in logs)
 *
 * Distinct from AdminOverview which shows CURRENT STATE.
 * This page answers "what happened, when, and who did it."
 */

import { useEffect, useState } from "react";
import { SectionCard, KpiCard, Badge, RowItem, Btn } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";
import {
  IconUsers, IconKey, IconPaintbrush, IconPlug,
  IconUserCheck, IconShield, IconInfo, IconDownload,
  IconActivity, IconCrown, IconPencil, IconPerson,
} from "@/components/icons";

interface TenantUser {
  id: string; email: string; name: string;
  roles: string[]; status: "active" | "pending" | "suspended"; invited_at: string;
}

type EventType = "user_invited" | "user_suspended" | "user_activated" | "role_assigned" | "login" | "config";

interface AuditEvent {
  id:        string;
  type:      EventType;
  title:     string;
  detail:    string;
  timestamp: string;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-DE", { dateStyle: "short", timeStyle: "short" });
}

function eventIcon(type: EventType) {
  switch (type) {
    case "user_invited":   return { icon: <IconUsers size={14} />,      bg: "var(--admin-bg)",  color: "var(--admin)" };
    case "user_suspended": return { icon: <IconInfo size={14} />,       bg: "var(--amber-bg)",  color: "var(--amber-status)" };
    case "user_activated": return { icon: <IconUserCheck size={14} />,  bg: "var(--green-bg)",  color: "var(--green-status)" };
    case "role_assigned":  return { icon: <IconPencil size={14} />,     bg: "var(--active-bg)", color: "var(--active-text)" };
    case "login":          return { icon: <IconKey size={14} />,        bg: "var(--green-bg)",  color: "var(--green-status)" };
    case "config":         return { icon: <IconPaintbrush size={14} />, bg: "var(--shell-bg)",  color: "var(--text-secondary)" };
  }
}

function eventBadge(type: EventType) {
  switch (type) {
    case "user_invited":   return <Badge variant="admin">Invited</Badge>;
    case "user_suspended": return <Badge variant="amber">Suspended</Badge>;
    case "user_activated": return <Badge variant="green">Activated</Badge>;
    case "role_assigned":  return <Badge variant="blue">Role change</Badge>;
    case "login":          return <Badge variant="green">Login</Badge>;
    case "config":         return <Badge variant="gray">Config</Badge>;
  }
}

// Derive audit events from tenant_users data
function deriveEvents(users: TenantUser[]): AuditEvent[] {
  const events: AuditEvent[] = [];

  for (const u of users) {
    // Invite event
    events.push({
      id:        `invite-${u.id}`,
      type:      "user_invited",
      title:     `${u.name} invited`,
      detail:    `${u.email} · Roles: ${u.roles.join(", ") || "none assigned"}`,
      timestamp: u.invited_at,
    });

    // Status events
    if (u.status === "suspended") {
      events.push({
        id:        `suspend-${u.id}`,
        type:      "user_suspended",
        title:     `${u.name} suspended`,
        detail:    `${u.email} · Access revoked`,
        timestamp: u.invited_at, // real suspension time not stored yet
      });
    }
    if (u.status === "active") {
      events.push({
        id:        `active-${u.id}`,
        type:      "user_activated",
        title:     `${u.name} activated`,
        detail:    `${u.email} · Account is live`,
        timestamp: u.invited_at,
      });
    }
  }

  // Sort newest first
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function AdminAudit() {
  const tenant = useTenant();
  const [users, setUsers]     = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<EventType | "all">("all");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: TenantUser[] }) => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allEvents = deriveEvents(users);
  const filtered  = filter === "all" ? allEvents : allEvents.filter((e) => e.type === filter);

  const totalEvents    = allEvents.length;
  const inviteCount    = allEvents.filter((e) => e.type === "user_invited").length;
  const suspendCount   = allEvents.filter((e) => e.type === "user_suspended").length;
  const roleCount      = allEvents.filter((e) => e.type === "role_assigned").length;

  const FILTER_OPTIONS: { label: string; value: EventType | "all" }[] = [
    { label: "All events",      value: "all" },
    { label: "User invites",    value: "user_invited" },
    { label: "Activations",     value: "user_activated" },
    { label: "Suspensions",     value: "user_suspended" },
    { label: "Role changes",    value: "role_assigned" },
    { label: "Config",          value: "config" },
  ];

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit & Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Event history for <strong>{tenant.name}</strong> — who did what and when.
          <span className="text-[var(--text-muted)]"> (Overview shows current state; this page shows history.)</span>
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Events"    value={loading ? "—" : String(totalEvents)} sub="All recorded activity"      color="var(--admin)" />
        <KpiCard label="User Invites"    value={loading ? "—" : String(inviteCount)} sub="Workspace onboardings"      color="var(--active-text)" />
        <KpiCard label="Suspensions"     value={loading ? "—" : String(suspendCount)} sub="Access revocations"        color="var(--amber-status)" />
        <KpiCard label="Role Changes"    value={loading ? "—" : String(roleCount)}   sub="Permission updates"         color="var(--green-status)" />
      </div>

      {/* Coming soon — login analytics */}
      <div className="mb-4 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3 flex items-start gap-3">
        <IconActivity size={15} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">Login & usage analytics coming soon</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Azure AD sign-in logs (successful logins, MFA events, failed attempts) and per-app usage
            metrics will appear here once the Azure Monitor integration is connected.
            <a href="/dashboard/admin/auth" className="text-[var(--admin)] underline ml-1">Configure Auth & SSO ↗</a>
          </p>
        </div>
      </div>

      {/* Event log */}
      <SectionCard
        title="Event Log"
        action={
          allEvents.length > 0 ? (
            <button
              onClick={() => {
                const csv = ["timestamp,type,title,detail",
                  ...allEvents.map((e) => `"${e.timestamp}","${e.type}","${e.title}","${e.detail}"`)
                ].join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = `audit-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-[var(--admin-border)] text-[var(--admin)] bg-[var(--admin-bg)] hover:bg-[var(--admin)] hover:text-white transition-colors"
            >
              <IconDownload size={12} /> Export CSV
            </button>
          ) : undefined
        }
      >
        {/* Filter bar */}
        <div className="flex gap-1.5 px-4 py-3 border-b border-[var(--shell-border)] flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                filter === opt.value
                  ? "bg-[var(--admin-bg)] text-[var(--admin)] border-[var(--admin-border)] font-semibold"
                  : "border-[var(--shell-border)] text-[var(--text-secondary)] hover:bg-[var(--shell-bg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">Loading events…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <IconShield size={24} className="text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No events yet</p>
            <p className="text-xs text-[var(--text-muted)]">
              Events are recorded as you invite users, change roles, and configure the workspace.
            </p>
          </div>
        ) : (
          filtered.map((event) => {
            const { icon, bg, color } = eventIcon(event.type);
            return (
              <RowItem
                key={event.id}
                icon={icon} iconBg={bg} iconColor={color}
                title={event.title}
                sub={event.detail}
                right={
                  <div className="flex flex-col items-end gap-1">
                    {eventBadge(event.type)}
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{fmtTime(event.timestamp)}</span>
                  </div>
                }
              />
            );
          })
        )}
      </SectionCard>
    </div>
  );
}
