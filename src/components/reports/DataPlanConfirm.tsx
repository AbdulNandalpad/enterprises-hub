"use client";

import { motion } from "framer-motion";
import type { SystemDef } from "./SystemSelector";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataSource {
  id:      string;
  label:   string;
  icon:    string;
  color:   string;
  tables:  string[];
}

export interface ChartPlan {
  type:    "bar" | "line" | "kpi" | "funnel" | "table";
  title:   string;
  source:  string;
}

export interface ReportPlan {
  intent:  string;
  title:   string;
  sources: DataSource[];
  charts:  ChartPlan[];
  notes:   string;
}

interface DataPlanConfirmProps {
  plan:       ReportPlan;
  onConfirm:  () => void;
  onEdit:     () => void;
}

// ─── Simulated plan (generated from intent in parent) ────────────────────────

// Full source definitions keyed by system id
const SOURCE_LIBRARY: Record<string, DataSource> = {
  sap: {
    id:     "sap",
    label:  "SAP S/4HANA",
    icon:   "SAP",
    color:  "#F0A500",
    tables: ["SD_VBAK (Orders)", "SD_LIKP (Delivery)", "FI_BKPF (Finance)"],
  },
  salesforce: {
    id:     "salesforce",
    label:  "Salesforce CRM",
    icon:   "SF",
    color:  "#00A1E0",
    tables: ["Opportunity", "Account", "ForecastingQuota"],
  },
  context: {
    id:     "context",
    label:  "Hub Context",
    icon:   "HUB",
    color:  "#C8341A",
    tables: ["Role permissions", "Calendar events", "Activity log"],
  },
};

// Chart templates that require specific systems
const ALL_CHART_TEMPLATES: Array<ChartPlan & { requires?: string }> = [
  { type: "kpi",    title: "Revenue · Pipeline · Win Rate · Fulfilment", source: "sap + salesforce" },
  { type: "bar",    title: "Revenue by Region — Q1 2026",                source: "sap",         requires: "sap"        },
  { type: "line",   title: "Monthly Order Trend vs Prior Year",           source: "sap",         requires: "sap"        },
  { type: "funnel", title: "Pipeline Funnel by Stage",                    source: "salesforce",  requires: "salesforce" },
];

export function buildPlanFromIntent(intent: string, selectedSystems?: SystemDef[]): ReportPlan {
  // Resolve which sources to show — honour user selection if provided
  const selectedIds = new Set(selectedSystems ? selectedSystems.map((s) => s.id) : Object.keys(SOURCE_LIBRARY));
  const sources = (selectedSystems ?? Object.values(SOURCE_LIBRARY).map((s) => ({ id: s.id } as SystemDef)))
    .map((s) => SOURCE_LIBRARY[s.id])
    .filter(Boolean) as DataSource[];

  // Filter charts to those whose required system is selected (or no requirement)
  const charts = ALL_CHART_TEMPLATES
    .filter((c) => !c.requires || selectedIds.has(c.requires))
    .map(({ requires: _r, ...c }) => c); // strip internal field

  // Build notes from selected systems
  const sourceNames = sources.map((s) => s.label).join(", ");
  const notes = `Date range: Q1 2026 (Jan – Mar). Sources: ${sourceNames}. Filtered to your EMEA Sales Manager role. AI insights generated after extraction.`;

  return {
    intent,
    title:  deriveTitle(intent),
    sources,
    charts,
    notes,
  };
}

function deriveTitle(intent: string): string {
  if (intent.length <= 60) return intent;
  return intent.slice(0, 57) + "…";
}

// ─── Chart type badge ─────────────────────────────────────────────────────────

const CHART_ICONS: Record<ChartPlan["type"], string> = {
  kpi:    "KPI",
  bar:    "BAR",
  line:   "LINE",
  funnel: "FNL",
  table:  "TBL",
};

const CHART_COLORS: Record<ChartPlan["type"], string> = {
  kpi:    "#a78bfa",
  bar:    "#F0A500",
  line:   "#00A1E0",
  funnel: "#22C55E",
  table:  "#888",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataPlanConfirm({ plan, onConfirm, onEdit }: DataPlanConfirmProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z"/></svg>
          Report Plan · Confirm to proceed
        </div>
        <h2
          className="text-2xl font-bold leading-snug mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
        >
          {plan.title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {plan.notes}
        </p>
      </motion.div>

      {/* Data sources */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        className="mb-8"
      >
        <h3 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
          Data Sources
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plan.sources.map((src, i) => (
            <motion.div
              key={src.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              className="relative overflow-hidden p-4"
              style={{
                border:     `1px solid ${src.color}44`,
                background: `${src.color}08`,
              }}
            >
              {/* Top accent */}
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: src.color }} />

              <div className="flex items-center justify-between mb-3">
                <span
                  className="font-mono text-[10px] font-bold tracking-widest"
                  style={{ color: src.color }}
                >
                  {src.icon}
                </span>
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: src.color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
              </div>

              <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {src.label}
              </p>

              <ul className="space-y-0.5">
                {src.tables.map((t) => (
                  <li key={t} className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                    · {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Charts */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        className="mb-8"
      >
        <h3 className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
          Visualisations
        </h3>
        <div className="space-y-2">
          {plan.charts.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 + i * 0.07, duration: 0.35 }}
              className="flex items-center gap-4 px-4 py-3"
              style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
            >
              <span
                className="font-mono text-[9px] font-bold tracking-widest w-12 text-center px-1.5 py-0.5"
                style={{
                  background: CHART_COLORS[c.type] + "18",
                  color:      CHART_COLORS[c.type],
                  border:     `1px solid ${CHART_COLORS[c.type]}44`,
                }}
              >
                {CHART_ICONS[c.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {c.title}
                </p>
              </div>
              <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {c.source}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={onConfirm}
          className="font-mono text-[11px] tracking-widest uppercase px-8 py-3 transition-opacity hover:opacity-80"
          style={{ background: "var(--text-primary)", color: "var(--shell-surface)" }}
        >
          Start Live Kitchen →
        </button>
        <button
          onClick={onEdit}
          className="font-mono text-[11px] tracking-widest uppercase px-5 py-3 transition-colors"
          style={{
            border:      "1px solid var(--shell-border)",
            color:       "var(--text-muted)",
            background:  "transparent",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          ← Edit intent
        </button>
      </motion.div>
    </div>
  );
}
