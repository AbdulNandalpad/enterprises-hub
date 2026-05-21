"use client";
import { useState } from "react";
import { TabBar, KpiCard, SectionCard, RowItem, Badge, Insight } from "./AdminUI";

export default function AdminOverview() {
  const [tab, setTab] = useState("Platform Health");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Overview</h1>
        <p className="text-sm text-[var(--text-secondary)]">Platform health, tenant status and system events.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Platform Health"]} active={tab} onChange={setTab} admin />

      <div className="flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Active Tenants"     value="3"     sub="▲ 1 onboarding"     color="var(--admin)" />
          <KpiCard label="Active Users"       value="148"   sub="▲ +12 this week"    color="var(--green-status)" />
          <KpiCard label="Connectors Live"    value="11"    sub="3 marketplace"       color="var(--active-text)" />
          <KpiCard label="Auth Events Today"  value="1,842" sub="0 failures"          color="var(--amber-status)" />
        </div>

        <Insight
          admin
          text={<><strong className="text-[var(--admin)]">AI Insight:</strong> Tenant <em>Müller Präzisionsteile GmbH</em> onboarding is 80% complete. Pending: OTRS connector auth config and branding logo upload. Estimated go-live: 2 days.</>}
        />

        <div className="grid grid-cols-2 gap-4">
          <SectionCard title="Tenant Status">
            <RowItem icon="🏢" iconBg="var(--green-bg)"  title="Trelleborg Sealing Solutions" sub="11 connectors · 148 users"  right={<Badge variant="green">Live</Badge>} />
            <RowItem icon="🏢" iconBg="var(--active-bg)" title="Schaeffler Group GmbH"        sub="7 connectors · 0 users"    right={<Badge variant="blue">Onboarding</Badge>} />
            <RowItem icon="🏢" iconBg="var(--amber-bg)"  title="Müller Präzisionsteile GmbH"  sub="80% config complete"       right={<Badge variant="amber">In Setup</Badge>} />
          </SectionCard>

          <SectionCard title="System Events">
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="Auth broker — all tokens healthy"   sub="Last check: 2 min ago"          right={<Badge variant="green">OK</Badge>} />
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="Connector registry — 11 active"     sub="No errors in last 24h"          right={<Badge variant="green">OK</Badge>} />
            <RowItem icon="⚠️" iconBg="var(--amber-bg)" title="OTRS connector — Müller tenant"     sub="Auth not yet configured"        right={<Badge variant="amber">Pending</Badge>} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
