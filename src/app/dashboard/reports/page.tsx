"use client";

import { motion } from "framer-motion";
import Link       from "next/link";

// ─── Sample saved reports ─────────────────────────────────────────────────────

const SAMPLE_REPORTS = [
  {
    id:       "1",
    title:    "Q1 2026 — EMEA Sales Performance",
    subtitle: "Revenue · Pipeline · Win Rate · Fulfilment",
    kpis:     ["€3.84M", "2.4×", "22%", "94%"],
    date:     "Today, 09:14",
    sources:  ["SAP", "SF", "HUB"],
    theme:    "editorial",
    accent:   "#F0A500",
  },
  {
    id:       "2",
    title:    "Pipeline Coverage vs Q4 Target",
    subtitle: "Opportunity · Forecast · Account",
    kpis:     ["89 opps", "€4.2M", "22%", "2.4×"],
    date:     "Yesterday, 16:45",
    sources:  ["SF", "HUB"],
    theme:    "midnight",
    accent:   "#00A1E0",
  },
  {
    id:       "3",
    title:    "Delivery Performance — Jan–Mar 2026",
    subtitle: "SAP Delivery · Fulfilment Rate · Delays",
    kpis:     ["1,247 orders", "94%", "38 delayed", "-1.2 days"],
    date:     "2 Jun 2026",
    sources:  ["SAP"],
    theme:    "signal",
    accent:   "#22C55E",
  },
];

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report, index }: { report: typeof SAMPLE_REPORTS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden group cursor-pointer"
      style={{
        border:      "1px solid var(--shell-border)",
        background:  "var(--shell-surface)",
      }}
    >
      {/* Top accent */}
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: report.accent }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <h3
              className="text-[15px] font-semibold leading-snug mb-1 truncate"
              style={{ color: "var(--ink)" }}
            >
              {report.title}
            </h3>
            <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              {report.subtitle}
            </p>
          </div>

          {/* Source badges */}
          <div className="flex gap-1 flex-shrink-0">
            {report.sources.map((s) => (
              <span
                key={s}
                className="font-mono text-[9px] font-bold px-1.5 py-0.5"
                style={{
                  background: report.accent + "18",
                  color:      report.accent,
                  border:     `1px solid ${report.accent}44`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Mini KPI strip */}
        <div className="grid grid-cols-4 gap-2 my-4">
          {report.kpis.map((kpi, i) => (
            <div
              key={i}
              className="p-2 text-center"
              style={{ background: "var(--paper)", border: "1px solid var(--shell-border)" }}
            >
              <p
                className="font-semibold text-[13px] leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
              >
                {kpi}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {report.date}
          </span>
          <span
            className="font-mono text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--ink)" }}
          >
            Open →
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-end justify-between mb-8"
      >
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            ⬡ Report Builder
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
          >
            Your Reports
          </h1>
        </div>

        <Link
          href="/dashboard/reports/new"
          className="font-mono text-[11px] tracking-widest uppercase px-6 py-3 transition-opacity hover:opacity-80"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          + New Report
        </Link>
      </motion.div>

      {/* Reports grid */}
      {SAMPLE_REPORTS.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {SAMPLE_REPORTS.map((r, i) => (
            <Link key={r.id} href="/dashboard/reports/new" className="block">
              <ReportCard report={r} index={i} />
            </Link>
          ))}
        </div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-24"
        >
          <p className="text-4xl mb-4">⬡</p>
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--text-muted)" }}>
            No reports yet
          </p>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
            Describe what you want to know in plain English — Claude maps the data and builds it live.
          </p>
          <Link
            href="/dashboard/reports/new"
            className="font-mono text-[11px] tracking-widest uppercase px-6 py-3 transition-opacity hover:opacity-80 inline-block"
            style={{ background: "var(--ink)", color: "var(--paper)" }}
          >
            Build your first report →
          </Link>
        </motion.div>
      )}

      {/* Feature caption */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 pt-6 text-center"
        style={{ borderTop: "1px solid var(--shell-border)" }}
      >
        <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          Powered by Claude · SAP · Salesforce · Hub Context · Reports are generated fresh on demand
        </p>
      </motion.div>

    </div>
  );
}
