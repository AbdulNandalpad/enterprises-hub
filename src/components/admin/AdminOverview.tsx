"use client";

import { useEffect, useState } from "react";
import { KpiCard, SectionCard, RowItem, Badge, Insight } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";
import { useAI } from "@/contexts/AIContext";

interface TenantUser {
  id: string; email: string; name: string;
  roles: string[]; status: "active" | "pending" | "suspended"; invited_at: string;
}

export default function AdminOverview() {
  const tenant       = useTenant();
  const { keyConfigured } = useAI();

  const [users, setUsers]     = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: TenantUser[] }) => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derived user stats
  const totalUsers     = users.length;
  const activeUsers    = users.filter((u) => u.status === "active").length;
  const pendingUsers   = users.filter((u) => u.status === "pending").length;
  const suspendedUsers = users.filter((u) => u.status === "suspended").length;

  // Role breakdown
  const adminCount    = users.filter((u) => u.roles.includes("Admin")).length;
  const managerCount  = users.filter((u) => u.roles.includes("Manager")).length;
  const employeeCount = users.filter((u) => u.roles.includes("Employee")).length;
  const readonlyCount = users.filter((u) => u.roles.includes("Read-only")).length;
  const noRoleCount   = users.filter((u) => u.roles.length === 0).length;

  // Recent invites (last 5)
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.invited_at).getTime() - new Date(a.invited_at).getTime())
    .slice(0, 5);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-DE", { day: "numeric", month: "short" });
  }

  const kval = (n: number) => loading ? "—" : String(n);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Overview</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Workspace health and user status for <strong>{tenant.name}</strong>.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Users"    value={kval(totalUsers)}    sub={loading ? "" : `${activeUsers} active · ${pendingUsers} pending`} color="var(--admin)" />
        <KpiCard label="Active Users"   value={kval(activeUsers)}   sub="Onboarded & enabled"         color="var(--green-status)" />
        <KpiCard label="Pending Invites" value={kval(pendingUsers)} sub="Awaiting first login"        color="var(--amber-status)" />
        <KpiCard label="Plan"           value={tenant.plan ?? "—"}  sub={`${tenant.domain}`}          color="var(--active-text)" />
      </div>

      {/* Alerts */}
      {pendingUsers > 0 && !loading && (
        <div className="mb-4">
          <Insight
            admin
            text={
              <>
                <strong className="text-[var(--admin)]">{pendingUsers} pending invite{pendingUsers > 1 ? "s" : ""}.</strong>{" "}
                These users have been invited but haven't logged in yet.
                Remind them or manage invites in <a href="/dashboard/admin/roles" className="underline">Users & Roles</a>.
              </>
            }
          />
        </div>
      )}
      {suspendedUsers > 0 && !loading && (
        <div className="mb-4">
          <Insight
            admin
            text={
              <>
                <strong className="text-[var(--admin)]">{suspendedUsers} suspended user{suspendedUsers > 1 ? "s" : ""}.</strong>{" "}
                Suspended accounts cannot access the workspace.
                Review them in <a href="/dashboard/admin/roles" className="underline">Users & Roles</a>.
              </>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">

        {/* Workspace info */}
        <SectionCard title="Workspace">
          <RowItem
            icon="🏢" iconBg="var(--admin-bg)"
            title={tenant.name}
            sub={`${tenant.domain} · ${tenant.plan ?? "Pro"} plan`}
            right={<Badge variant={tenant.active ? "green" : "red"}>{tenant.active ? "Active" : "Inactive"}</Badge>}
          />
          <RowItem
            icon="🎨" iconBg="var(--active-bg)"
            title="Branding"
            sub={`${tenant.brandName} · ${tenant.primaryColor}${tenant.logoUrl ? " · Logo set" : " · No logo"}`}
            right={<a href="/dashboard/admin/branding" className="text-[11px] text-[var(--admin)] hover:underline">Edit ↗</a>}
          />
          <RowItem
            icon="🤖" iconBg={keyConfigured ? "var(--green-bg)" : "var(--amber-bg)"}
            title="AI Copilot"
            sub={keyConfigured ? "API key configured" : "No API key — AI features disabled"}
            right={<Badge variant={keyConfigured ? "green" : "amber"}>{keyConfigured ? "Enabled" : "Not configured"}</Badge>}
          />
        </SectionCard>

        {/* Role breakdown */}
        <SectionCard title="Role Breakdown">
          {loading ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">Loading…</div>
          ) : totalUsers === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
              No users yet.{" "}
              <a href="/dashboard/admin/roles" className="text-[var(--admin)] underline">Invite your first user ↗</a>
            </div>
          ) : (
            <>
              {adminCount    > 0 && <RowItem icon="👑" iconBg="var(--admin-bg)"  title="Admins"      sub={`${adminCount} user${adminCount > 1 ? "s" : ""}`}    right={<span className="font-mono text-xs text-[var(--admin)]">{adminCount}</span>} />}
              {managerCount  > 0 && <RowItem icon="📋" iconBg="var(--active-bg)" title="Managers"    sub={`${managerCount} user${managerCount > 1 ? "s" : ""}`}  right={<span className="font-mono text-xs text-[var(--active-text)]">{managerCount}</span>} />}
              {employeeCount > 0 && <RowItem icon="👤" iconBg="var(--green-bg)"  title="Employees"   sub={`${employeeCount} user${employeeCount > 1 ? "s" : ""}`} right={<span className="font-mono text-xs text-[var(--green-status)]">{employeeCount}</span>} />}
              {readonlyCount > 0 && <RowItem icon="👁" iconBg="var(--amber-bg)"  title="Read-only"   sub={`${readonlyCount} user${readonlyCount > 1 ? "s" : ""}`} right={<span className="font-mono text-xs text-[var(--amber-status)]">{readonlyCount}</span>} />}
              {noRoleCount   > 0 && <RowItem icon="⚠️" iconBg="var(--shell-bg)" title="No roles assigned" sub={`${noRoleCount} user${noRoleCount > 1 ? "s" : ""} — assign roles`} right={<Badge variant="amber">{noRoleCount}</Badge>} />}
            </>
          )}
        </SectionCard>

        {/* Recent activity */}
        <SectionCard title="Recently Added Users">
          {loading ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">Loading…</div>
          ) : recentUsers.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No users yet.</div>
          ) : (
            recentUsers.map((u) => (
              <RowItem
                key={u.email}
                icon={u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                iconBg="var(--admin-bg)"
                title={u.name}
                sub={`${u.email} · ${u.roles.join(", ") || "No roles"}`}
                right={
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={u.status === "active" ? "green" : u.status === "pending" ? "amber" : "red"}>
                      {u.status}
                    </Badge>
                    <span className="text-[10px] text-[var(--text-muted)]">{fmtDate(u.invited_at)}</span>
                  </div>
                }
              />
            ))
          )}
        </SectionCard>

        {/* Quick links */}
        <SectionCard title="Quick Actions">
          {[
            { icon: "👥", label: "Invite users",      sub: "Add team members and assign roles",   href: "/dashboard/admin/roles" },
            { icon: "📥", label: "Bulk import",        sub: "Upload Excel to add multiple users",  href: "/dashboard/admin/roles" },
            { icon: "🎨", label: "Update branding",    sub: "Logo, colours, shell title",          href: "/dashboard/admin/branding" },
            { icon: "🔌", label: "Connector registry", sub: "Manage app integrations",             href: "/dashboard/admin/connectors" },
            { icon: "🛡",  label: "AI Governance",     sub: "EU AI Act audit trail",               href: "/dashboard/admin/governance" },
            { icon: "📊", label: "Audit & Analytics",  sub: "Activity logs and reports",           href: "/dashboard/admin/audit" },
          ].map((item) => (
            <a key={item.href + item.label} href={item.href}>
              <RowItem
                icon={item.icon} iconBg="var(--shell-bg)"
                title={item.label} sub={item.sub}
                right={<span className="text-[var(--text-muted)] text-xs">→</span>}
              />
            </a>
          ))}
        </SectionCard>

      </div>
    </div>
  );
}
