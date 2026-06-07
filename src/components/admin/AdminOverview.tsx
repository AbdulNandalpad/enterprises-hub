"use client";

import { useEffect, useState } from "react";
import { KpiCard, SectionCard, RowItem, Badge, Insight } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";
import { useAI } from "@/contexts/AIContext";
import {
  IconBuilding, IconPaintbrush, IconBolt, IconUsers, IconPerson,
  IconPencil, IconBookOpen, IconInfo, IconMail, IconUpload,
  IconPlug, IconShield, IconTrendingUp, IconBarChart, IconKey,
  IconArrowRight, IconCrown, IconUserCheck,
} from "@/components/icons";

interface TenantUser {
  id: string; email: string; name: string;
  roles: string[]; status: "active" | "pending" | "suspended"; invited_at: string;
}

export default function AdminOverview() {
  const tenant            = useTenant();
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

  const totalUsers     = users.length;
  const activeUsers    = users.filter((u) => u.status === "active").length;
  const pendingUsers   = users.filter((u) => u.status === "pending").length;
  const suspendedUsers = users.filter((u) => u.status === "suspended").length;

  const adminCount    = users.filter((u) => u.roles.includes("Admin")).length;
  const managerCount  = users.filter((u) => u.roles.includes("Manager")).length;
  const employeeCount = users.filter((u) => u.roles.includes("Employee")).length;
  const readonlyCount = users.filter((u) => u.roles.includes("Read-only")).length;
  const noRoleCount   = users.filter((u) => u.roles.length === 0).length;

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.invited_at).getTime() - new Date(a.invited_at).getTime())
    .slice(0, 5);

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-DE", { day: "numeric", month: "short" });
  }

  const kval = (n: number) => loading ? "—" : String(n);

  const ic = (color: string) => ({ color });

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Overview</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Current workspace state for <strong>{tenant.name}</strong>.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Users"     value={kval(totalUsers)}   sub={loading ? "" : `${activeUsers} active · ${pendingUsers} pending`} color="var(--admin)" />
        <KpiCard label="Active Users"    value={kval(activeUsers)}  sub="Onboarded & enabled"    color="var(--green-status)" />
        <KpiCard label="Pending Invites" value={kval(pendingUsers)} sub="Awaiting first login"   color="var(--amber-status)" />
        <KpiCard label="Plan"            value={tenant.plan ?? "—"} sub={tenant.domain}          color="var(--active-text)" />
      </div>

      {/* Alerts */}
      {pendingUsers > 0 && !loading && (
        <div className="mb-4">
          <Insight admin text={<><strong className="text-[var(--admin)]">{pendingUsers} pending invite{pendingUsers > 1 ? "s" : ""}.</strong>{" "}Invited but haven't logged in yet. <a href="/dashboard/admin/roles" className="underline">Manage in Users & Roles ↗</a></>} />
        </div>
      )}
      {suspendedUsers > 0 && !loading && (
        <div className="mb-4">
          <Insight admin text={<><strong className="text-[var(--admin)]">{suspendedUsers} suspended account{suspendedUsers > 1 ? "s" : ""}.</strong>{" "}These users cannot access the workspace. <a href="/dashboard/admin/roles" className="underline">Review ↗</a></>} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Workspace info */}
        <SectionCard title="Workspace">
          <RowItem icon={<IconBuilding size={15} />}   iconBg="var(--admin-bg)"  iconColor="var(--admin)"        title={tenant.name}       sub={`${tenant.domain} · ${tenant.plan ?? "Pro"} plan`} right={<Badge variant={tenant.active ? "green" : "red"}>{tenant.active ? "Active" : "Inactive"}</Badge>} />
          <RowItem icon={<IconPaintbrush size={15} />} iconBg="var(--active-bg)" iconColor="var(--active-text)"  title="Branding"           sub={`${tenant.brandName} · ${tenant.primaryColor}${tenant.logoUrl ? " · Logo set" : ""}`} right={<a href="/dashboard/admin/branding" className="text-[11px] text-[var(--admin)] hover:underline">Edit ↗</a>} />
          <RowItem icon={<IconBolt size={15} />}       iconBg={keyConfigured ? "var(--green-bg)" : "var(--amber-bg)"} iconColor={keyConfigured ? "var(--green-status)" : "var(--amber-status)"} title="AI Copilot" sub={keyConfigured ? "API key configured" : "No API key — AI features disabled"} right={<Badge variant={keyConfigured ? "green" : "amber"}>{keyConfigured ? "Enabled" : "Not set"}</Badge>} />
        </SectionCard>

        {/* Role breakdown */}
        <SectionCard title="Role Breakdown">
          {loading ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">Loading…</div>
          ) : totalUsers === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No users yet. <a href="/dashboard/admin/roles" className="text-[var(--admin)] underline">Invite your first user ↗</a></div>
          ) : (
            <>
              {adminCount    > 0 && <RowItem icon={<IconCrown size={14} />}     iconBg="var(--admin-bg)"  iconColor="var(--admin)"        title="Admins"    sub={`${adminCount} user${adminCount > 1 ? "s" : ""}`}    right={<span className="font-mono text-xs font-bold text-[var(--admin)]">{adminCount}</span>} />}
              {managerCount  > 0 && <RowItem icon={<IconPencil size={14} />}    iconBg="var(--active-bg)" iconColor="var(--active-text)"  title="Managers"  sub={`${managerCount} user${managerCount > 1 ? "s" : ""}`}  right={<span className="font-mono text-xs font-bold text-[var(--active-text)]">{managerCount}</span>} />}
              {employeeCount > 0 && <RowItem icon={<IconPerson size={14} />}    iconBg="var(--green-bg)"  iconColor="var(--green-status)" title="Employees" sub={`${employeeCount} user${employeeCount > 1 ? "s" : ""}`} right={<span className="font-mono text-xs font-bold text-[var(--green-status)]">{employeeCount}</span>} />}
              {readonlyCount > 0 && <RowItem icon={<IconBookOpen size={14} />}  iconBg="var(--amber-bg)"  iconColor="var(--amber-status)" title="Read-only" sub={`${readonlyCount} user${readonlyCount > 1 ? "s" : ""}`} right={<span className="font-mono text-xs font-bold text-[var(--amber-status)]">{readonlyCount}</span>} />}
              {noRoleCount   > 0 && <RowItem icon={<IconInfo size={14} />}      iconBg="var(--shell-bg)"  iconColor="var(--text-muted)"   title="No roles"  sub={`${noRoleCount} user${noRoleCount > 1 ? "s" : ""} — assign roles in Users & Roles`} right={<Badge variant="amber">{noRoleCount}</Badge>} />}
            </>
          )}
        </SectionCard>

        {/* Recent users */}
        <SectionCard title="Recently Added">
          {loading ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">Loading…</div>
          ) : recentUsers.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No users yet.</div>
          ) : (
            recentUsers.map((u) => (
              <RowItem
                key={u.email}
                icon={<IconUserCheck size={14} />}
                iconBg="var(--admin-bg)" iconColor="var(--admin)"
                title={u.name}
                sub={`${u.email} · ${u.roles.join(", ") || "No roles"}`}
                right={
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={u.status === "active" ? "green" : u.status === "pending" ? "amber" : "red"}>{u.status}</Badge>
                    <span className="text-[10px] text-[var(--text-muted)]">{fmtDate(u.invited_at)}</span>
                  </div>
                }
              />
            ))
          )}
        </SectionCard>

        {/* Quick actions */}
        <SectionCard title="Quick Actions">
          {[
            { icon: <IconUsers size={14} />,     bg: "var(--admin-bg)",  color: "var(--admin)",        label: "Invite users",       sub: "Add team members and assign roles",  href: "/dashboard/admin/roles" },
            { icon: <IconUpload size={14} />,    bg: "var(--active-bg)", color: "var(--active-text)", label: "Bulk import",         sub: "Upload Excel to add multiple users", href: "/dashboard/admin/roles" },
            { icon: <IconPaintbrush size={14}/>, bg: "var(--green-bg)",  color: "var(--green-status)",label: "Update branding",     sub: "Logo, colours, shell title",         href: "/dashboard/admin/branding" },
            { icon: <IconPlug size={14} />,      bg: "var(--amber-bg)",  color: "var(--amber-status)",label: "Connector registry",  sub: "Manage app integrations",            href: "/dashboard/admin/connectors" },
            { icon: <IconShield size={14} />,    bg: "var(--admin-bg)",  color: "var(--admin)",        label: "AI Governance",       sub: "EU AI Act audit trail",              href: "/dashboard/admin/governance" },
            { icon: <IconTrendingUp size={14}/>, bg: "var(--active-bg)", color: "var(--active-text)", label: "Audit & Analytics",  sub: "Event history and activity logs",    href: "/dashboard/admin/audit" },
          ].map((item) => (
            <a key={item.label} href={item.href}>
              <RowItem icon={item.icon} iconBg={item.bg} iconColor={item.color} title={item.label} sub={item.sub} right={<IconArrowRight size={12} className="text-[var(--text-muted)]" />} />
            </a>
          ))}
        </SectionCard>

      </div>
    </div>
  );
}
