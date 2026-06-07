"use client";
import { useState } from "react";
import { TabBar, KpiCard, SectionCard, RowItem, Badge, Btn, Insight, ProgBar } from "./AdminUI";

const featured = [
  { name: "proALPHA ERP",     cat: "ERP",      vendor: "proALPHA Consulting AG", price: "€1,500 / tenant", installs: 41,  type: "premium"  },
  { name: "Infor CloudSuite", cat: "ERP",      vendor: "Infor Partner GmbH",     price: "€1,200 / tenant", installs: 28,  type: "premium"  },
  { name: "Odoo 17",          cat: "ERP",      vendor: "OdooPartner.de",         price: "Free",            installs: 114, type: "verified" },
  { name: "HubSpot CRM",      cat: "CRM & CX", vendor: "HubSpot Official",       price: "Free",            installs: 88,  type: "verified" },
  { name: "Sage X3",          cat: "ERP",      vendor: "Sage Partner EU",        price: "€800 / tenant",   installs: 19,  type: "premium"  },
];

export default function AdminMarketplace() {
  const [tab, setTab] = useState("Browse");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Marketplace</h1>
        <p className="text-sm text-[var(--text-secondary)]">Browse and install connectors, review partner submissions, track revenue.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Browse","My Submissions","Revenue"]} active={tab} onChange={setTab} admin />

      {tab === "Browse" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">Marketplace:</strong> 24 connectors available. 3 pending review. Partners have earned €12,400 in revenue share this month. Top category: ERP (9 connectors).</>}
          />
          <div className="flex flex-col gap-3">
            {featured.map((c) => (
              <div
                key={c.name}
                className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderLeft: `3px solid ${c.type === "premium" ? "var(--amber-status)" : "var(--green-status)"}` }}
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--shell-bg)] flex items-center justify-center text-lg flex-shrink-0">🔌</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{c.vendor} · {c.cat}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {c.type === "premium" ? <Badge variant="amber">★ Premium</Badge> : <Badge variant="green">✓ Verified</Badge>}
                    <span className="text-[10px] text-[var(--text-muted)] border border-[var(--shell-border)] rounded px-1.5 py-0.5 bg-[var(--shell-bg)]">⬇ {c.installs} installs</span>
                    <span className="text-[10px] text-[var(--text-muted)] border border-[var(--shell-border)] rounded px-1.5 py-0.5 bg-[var(--shell-bg)]">{c.price}</span>
                  </div>
                </div>
                <Btn variant="primary">Install</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "My Submissions" && (
        <SectionCard title="Partner Submissions">
          <RowItem icon="📦" iconBg="var(--green-bg)"  title="proALPHA ERP v1.2"  sub="proALPHA Consulting AG · Submitted 28 Apr" right={<Badge variant="green">Published</Badge>} />
          <RowItem icon="📦" iconBg="var(--amber-bg)"  title="Abas ERP v1.0"      sub="Abas Partner · Submitted 02 May"           right={<Badge variant="amber">Under Review</Badge>} />
          <RowItem icon="📦" iconBg="var(--active-bg)" title="Zendesk v2.1"       sub="Zendesk Official · Submitted 01 May"       right={<Badge variant="blue">Security Scan</Badge>} />
        </SectionCard>
      )}

      {tab === "Revenue" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Revenue Share MTD" value="€12,400" sub="▲ +34% vs Apr"      color="var(--green-status)" />
            <KpiCard label="Total Installs"    value="290"     sub="▲ +41 this month"   color="var(--active-text)" />
            <KpiCard label="Active Partners"   value="8"       sub="3 new this quarter" color="#7c3aed" />
            <KpiCard label="Avg Rev/Connector" value="€1,550"  sub="Premium avg"        color="var(--amber-status)" />
          </div>
          <SectionCard title="Revenue by Partner">
            {[
              { initials: "PA", name: "proALPHA Consulting AG", sub: "41 installs · proALPHA ERP", rev: "€4,920", pct: 80,  badge: <Badge variant="admin">Top Partner</Badge> },
              { initials: "IN", name: "Infor Partner GmbH",     sub: "28 installs · Infor CloudSuite", rev: "€2,688", pct: 54, badge: <Badge variant="green">Active</Badge> },
              { initials: "SA", name: "Sage Partner EU",        sub: "19 installs · Sage X3",       rev: "€1,216", pct: 37,  badge: <Badge variant="green">Active</Badge> },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--shell-border)] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--active-bg)] flex items-center justify-center text-xs font-bold text-[var(--active-text)] flex-shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{p.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{p.sub}</div>
                  <ProgBar pct={p.pct} color="var(--admin)" />
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{p.rev}</span>
                  {p.badge}
                </div>
              </div>
            ))}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
