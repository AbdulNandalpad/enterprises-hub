"use client";
import { useState } from "react";
import { TabBar, SectionCard, Badge, Btn } from "./AdminUI";

const users = [
  { initials: "AR", name: "Abdul Rashid",   sub: "CRM Lead · ar@trelleborg.com",  roles: ["Admin","Sales","Pricing","ITSM"], color: "#7c3aed", bg: "var(--admin-bg)" },
  { initials: "MK", name: "Mia Kaufmann",   sub: "Marketing Manager",              roles: ["Marketing","CRM"],              color: "var(--active-text)", bg: "var(--active-bg)" },
  { initials: "TM", name: "Thomas Müller",  sub: "Warehouse Manager",              roles: ["ERP"],                          color: "var(--green-status)", bg: "var(--green-bg)" },
  { initials: "HF", name: "Hannah Fischer", sub: "Sales Executive",                roles: ["Sales","CRM","Pricing"],        color: "var(--amber-status)", bg: "var(--amber-bg)" },
];

const matrix = [
  { role: "Admin",       vals: ["✅","✅","✅","✅","✅","✅","✅"] },
  { role: "Sales",       vals: ["👁","✅","👁","✅","✅","—","—"] },
  { role: "Marketing",   vals: ["—","👁","✅","—","✅","—","—"] },
  { role: "Procurement", vals: ["✅","—","—","✅","✅","—","—"] },
  { role: "IT",          vals: ["👁","—","—","—","✅","✅","✅"] },
];
const matrixCols = ["ERP","CRM","Marketing","Pricing","Collab","ITSM","Admin"];

export default function AdminRoles() {
  const [tab, setTab] = useState("Users");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Users & Roles</h1>
        <p className="text-sm text-[var(--text-secondary)]">Manage users, assign roles, and control system visibility.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Users","Role Config"]} active={tab} onChange={setTab} admin />

      {tab === "Users" && (
        <SectionCard title="Active Users — Trelleborg Sealing Solutions" action={<Btn>+ Invite User</Btn>}>
          {users.map((u) => (
            <div key={u.name} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)] transition-colors">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                style={{ background: u.bg, color: u.color }}
              >
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{u.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{u.sub}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {u.roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded border bg-[var(--active-bg)] text-[var(--active-text)] border-[var(--active-border)]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <Badge variant="green">Active</Badge>
            </div>
          ))}
        </SectionCard>
      )}

      {tab === "Role Config" && (
        <SectionCard title="Role → System Visibility Matrix" action={<Btn>+ New Role</Btn>}>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--shell-border)]">
                  <th className="text-left py-2 px-3 text-[var(--text-muted)] font-semibold">Role</th>
                  {matrixCols.map((c) => (
                    <th key={c} className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.role} className="border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)]">
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{row.role}</td>
                    {row.vals.map((v, i) => (
                      <td
                        key={i}
                        className="text-center py-2.5 px-2"
                        style={{
                          color: v === "✅" ? "var(--green-status)" : v === "👁" ? "var(--active-text)" : "var(--text-muted)",
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--text-muted)] mt-3">
              ✅ Full access &nbsp;·&nbsp; 👁 Read only &nbsp;·&nbsp; — Hidden
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
