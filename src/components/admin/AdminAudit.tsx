"use client";
import { useState } from "react";
import { TabBar, KpiCard, SectionCard, RowItem, Badge, Btn, ProgBar } from "./AdminUI";

const usageData = [
  { name: "SAP S/4HANA",           pct: 38, sessions: 1832, color: "var(--active-text)" },
  { name: "Sales & Service Cloud",  pct: 24, sessions: 1157, color: "var(--green-status)" },
  { name: "Microsoft Teams",        pct: 18, sessions: 868,  color: "#7c3aed" },
  { name: "Marketo",                pct: 9,  sessions: 434,  color: "#ea580c" },
  { name: "Jira",                   pct: 7,  sessions: 337,  color: "var(--red-status)" },
  { name: "Price Estimator",        pct: 4,  sessions: 193,  color: "var(--amber-status)" },
];

const auditEvents = [
  { icon: "🔑", bg: "var(--green-bg)",  title: "Login — Abdul Rashid",             sub: "Azure AD · Chrome · Böblingen · Today 08:41",     badge: <Badge variant="green">Success</Badge> },
  { icon: "⚙️", bg: "var(--active-bg)", title: "Connector enabled — Marketo",       sub: "Admin: Abdul Rashid · Today 08:55",               badge: <Badge variant="blue">Config</Badge> },
  { icon: "🔑", bg: "var(--amber-bg)",  title: "Token refresh — SAP S/4HANA",       sub: "Auth broker · Auto-refresh · Today 09:00",        badge: <Badge variant="green">Success</Badge> },
  { icon: "👤", bg: "var(--purple-bg)", title: "User role updated — Hannah Fischer", sub: "Added: Pricing role · Admin: Abdul Rashid · Yesterday", badge: <Badge variant="purple">Role Change</Badge> },
  { icon: "🔑", bg: "var(--green-bg)",  title: "Login — Mia Kaufmann",              sub: "Azure AD · Edge · Stuttgart · Yesterday 09:02",   badge: <Badge variant="green">Success</Badge> },
];

export default function AdminAudit() {
  const [tab, setTab] = useState("Usage Analytics");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit & Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)]">Usage trends, system activity and compliance audit log.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Usage Analytics","Audit Log"]} active={tab} onChange={setTab} admin />

      {tab === "Usage Analytics" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <KpiCard label="Total Sessions MTD"  value="4,821" sub="▲ +18% vs Apr"       color="var(--active-text)" />
            <KpiCard label="Copilot Queries"     value="1,204" sub="▲ +44% vs Apr"       color="var(--green-status)" />
            <KpiCard label="Avg Session Length"  value="34 min" sub="Across all systems" color="#7c3aed" />
            <KpiCard label="Top System"          value="SAP"   sub="38% of sessions"     color="var(--amber-status)" />
          </div>

          <SectionCard title="System Usage — May 2026">
            {usageData.map((s) => (
              <div key={s.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--shell-border)] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{s.name}</div>
                  <ProgBar pct={s.pct} color={s.color} />
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0 w-12 text-right">
                  {s.sessions.toLocaleString()}
                </div>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {tab === "Audit Log" && (
        <SectionCard title="Recent Audit Events" action={<Btn>Export CSV</Btn>}>
          {auditEvents.map((e, i) => (
            <RowItem key={i} icon={e.icon} iconBg={e.bg} title={e.title} sub={e.sub} right={e.badge} />
          ))}
        </SectionCard>
      )}
    </div>
  );
}
