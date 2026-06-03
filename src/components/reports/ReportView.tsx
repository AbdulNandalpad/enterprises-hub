"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
} from "recharts";

// ─── Simulated data ───────────────────────────────────────────────────────────

const KPI_DATA = [
  { label: "Total Revenue",      value: "€3.84M",  delta: "+12%",  positive: true,  color: "#F0A500" },
  { label: "Pipeline Coverage",  value: "2.4×",    delta: "+0.3×", positive: true,  color: "#00A1E0" },
  { label: "Win Rate",           value: "22 %",    delta: "-3 pp", positive: false, color: "#C8341A" },
  { label: "Fulfilment Rate",    value: "94.2 %",  delta: "+1.8%", positive: true,  color: "#22C55E" },
];

const REGION_DATA = [
  { region: "DACH",  revenue: 1480, target: 1400 },
  { region: "UK",    revenue: 860,  target: 900  },
  { region: "Benelux",revenue: 640, target: 600  },
  { region: "France",revenue: 530,  target: 550  },
  { region: "Nordics",revenue: 330, target: 300  },
];

const TREND_DATA = [
  { month: "Oct", cur: 920,  prev: 810 },
  { month: "Nov", cur: 1050, prev: 890 },
  { month: "Dec", cur: 1320, prev: 1100},
  { month: "Jan", cur: 1040, prev: 980 },
  { month: "Feb", cur: 1280, prev: 1050},
  { month: "Mar", cur: 1460, prev: 1190},
];

const FUNNEL_DATA = [
  { name: "Prospecting", value: 89,  fill: "#F0A500" },
  { name: "Qualification",value: 54, fill: "#F0B52A" },
  { name: "Proposal",    value: 31,  fill: "#00A1E0" },
  { name: "Negotiation", value: 18,  fill: "#1da8e4" },
  { name: "Closed Won",  value: 12,  fill: "#22C55E" },
];

const INSIGHTS = [
  {
    icon:  "↗",
    color: "#22C55E",
    title: "DACH outperforming target",
    body:  "DACH region exceeded Q1 revenue target by 5.7% (€80 K over). Deal velocity has improved — average sales cycle dropped from 34 to 28 days. No corrective action needed; replicate playbook in UK.",
  },
  {
    icon:  "⚠",
    color: "#F0A500",
    title: "Win rate declining — Q4 pressure",
    body:  "Win rate fell 3 pp YoY (25 % → 22 %). Losses concentrate in €200K–500K deals against two competitors. Recommend competitive battle-card refresh and executive sponsor engagement for mid-market deals.",
  },
];

// ─── Shared chart tooltip ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 font-mono text-[11px] leading-relaxed"
      style={{
        background: "var(--ink)",
        color:      "var(--paper)",
        border:     "none",
        borderRadius: 2,
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? "#ccc" }}>
          {p.name}: {typeof p.value === "number" ? `€${p.value}K` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({ kpi, index }: { kpi: typeof KPI_DATA[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden p-5"
      style={{
        border:     `1px solid var(--shell-border)`,
        background: "var(--shell-surface)",
      }}
    >
      <div className="absolute top-0 left-0 w-[3px] bottom-0" style={{ background: kpi.color }} />

      <p className="font-mono text-[10px] tracking-widest uppercase mb-2 pl-2" style={{ color: "var(--text-muted)" }}>
        {kpi.label}
      </p>
      <div className="flex items-end gap-3 pl-2">
        <span
          className="text-3xl font-bold leading-none"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
        >
          {kpi.value}
        </span>
        <span
          className="font-mono text-[11px] font-semibold mb-0.5"
          style={{ color: kpi.positive ? "#22C55E" : "#ef4444" }}
        >
          {kpi.delta}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  source,
  delay,
  children,
}: {
  title:    string;
  source:   string;
  delay:    number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="mb-8"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h3>
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          {source}
        </span>
      </div>
      <div
        className="p-5"
        style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ─── Theme definitions ────────────────────────────────────────────────────────

const THEMES = [
  { id: "editorial", label: "Editorial" },
  { id: "midnight",  label: "Midnight"  },
  { id: "signal",    label: "Signal"    },
];

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  theme,
  onTheme,
  onRestart,
}: {
  theme:     string;
  onTheme:   (t: string) => void;
  onRestart: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3 mb-8"
      style={{
        border:     "1px solid var(--shell-border)",
        background: "var(--shell-surface)",
      }}
    >
      {/* Left — meta */}
      <div className="flex items-center gap-6">
        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          Q1 2026 · EMEA
        </span>
        <span
          className="font-mono text-[10px] px-2 py-0.5"
          style={{ background: "#22C55E18", color: "#22C55E", border: "1px solid #22C55E44" }}
        >
          ✓ Live data
        </span>
      </div>

      {/* Right — theme switcher + restart */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTheme(t.id)}
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 transition-all"
              style={{
                background:  theme === t.id ? "var(--ink)" : "transparent",
                color:       theme === t.id ? "var(--paper)" : "var(--text-muted)",
                border:      `1px solid ${theme === t.id ? "var(--ink)" : "var(--shell-border)"}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onRestart}
          className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 transition-colors"
          style={{
            border: "1px solid var(--shell-border)",
            color:  "var(--text-muted)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          + New Report
        </button>
      </div>
    </div>
  );
}

// ─── Midnight theme override (CSS injection) ──────────────────────────────────

const MIDNIGHT_STYLE = `
  .rpt-midnight {
    --ink:            #e8e8e8;
    --paper:          #07080D;
    --shell-surface:  #0C0D11;
    --shell-border:   #1e1f27;
    --text-secondary: #888;
    --text-muted:     #555;
    --active-bg:      rgba(255,255,255,0.06);
    --active-text:    #e8e8e8;
    --hover-bg:       rgba(255,255,255,0.04);
    background:       #07080D;
    color:            #e8e8e8;
  }
`;

const SIGNAL_STYLE = `
  .rpt-signal {
    --ink:            #0A1628;
    --paper:          #F0F6FF;
    --shell-surface:  #E8F1FF;
    --shell-border:   #C5D8F5;
    --text-secondary: #4A6080;
    --text-muted:     #7A95B0;
    background:       #F0F6FF;
    color:            #0A1628;
  }
`;

// ─── Main ReportView ──────────────────────────────────────────────────────────

interface ReportViewProps {
  title:     string;
  onRestart: () => void;
}

export default function ReportView({ title, onRestart }: ReportViewProps) {
  const [theme, setTheme] = useState("editorial");

  const themeClass =
    theme === "midnight" ? "rpt-midnight"
    : theme === "signal"   ? "rpt-signal"
    : "";

  return (
    <>
      {/* Inject theme overrides */}
      <style>{MIDNIGHT_STYLE}{SIGNAL_STYLE}</style>

      <div className={`${themeClass} transition-colors duration-500 min-h-screen`}>
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Report title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
              AI-Generated Report · Q1 2026
            </div>
            <h1
              className="text-3xl font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
            >
              {title}
            </h1>
          </motion.div>

          {/* Filter bar */}
          <FilterBar theme={theme} onTheme={setTheme} onRestart={onRestart} />

          {/* KPI tiles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-4 gap-3 mb-8"
          >
            {KPI_DATA.map((kpi, i) => (
              <KpiTile key={kpi.label} kpi={kpi} index={i} />
            ))}
          </motion.div>

          {/* Revenue by Region */}
          <Section title="Revenue by Region" source="SAP S/4HANA · SD Module" delay={0.2}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={REGION_DATA} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" vertical={false} />
                <XAxis
                  dataKey="region"
                  tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `€${v}K`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="revenue" name="Revenue"  fill="#F0A500" radius={[2,2,0,0]} maxBarSize={32} />
                <Bar dataKey="target"  name="Target"   fill="#F0A50040" radius={[2,2,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          {/* Monthly trend */}
          <Section title="Monthly Order Trend vs Prior Year" source="SAP S/4HANA · SD Module" delay={0.3}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `€${v}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone" dataKey="cur" name="Q1 2026"
                  stroke="#00A1E0" strokeWidth={2} dot={{ r: 3, fill: "#00A1E0" }}
                />
                <Line
                  type="monotone" dataKey="prev" name="Q1 2025"
                  stroke="#00A1E040" strokeWidth={1.5} dot={false} strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          {/* Two-col: funnel + insights */}
          <div className="grid grid-cols-2 gap-6 mb-8">

            {/* Pipeline funnel */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  Pipeline Funnel
                </h3>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Salesforce
                </span>
              </div>
              <div
                className="p-5"
                style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <FunnelChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as typeof FUNNEL_DATA[0];
                        return (
                          <div className="px-3 py-2 font-mono text-[11px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                            {d.name}: {d.value} deals
                          </div>
                        );
                      }}
                    />
                    <Funnel dataKey="value" data={FUNNEL_DATA} isAnimationActive>
                      {FUNNEL_DATA.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                      <LabelList
                        position="center"
                        content={({ x, y, width, height, value, index }) => {
                          if (typeof index !== "number" || typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number") return null;
                          return (
                            <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle"
                              fontSize={10} fontFamily="IBM Plex Mono" fill="white" fillOpacity={0.9}>
                              {FUNNEL_DATA[index]?.name} · {value}
                            </text>
                          );
                        }}
                      />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.5 }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  AI Insights
                </h3>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Claude analysis
                </span>
              </div>
              <div className="space-y-3">
                {INSIGHTS.map((ins, i) => (
                  <motion.div
                    key={ins.title}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.52 + i * 0.1, duration: 0.4 }}
                    className="p-4 relative overflow-hidden"
                    style={{
                      border:     `1px solid ${ins.color}33`,
                      background: `${ins.color}08`,
                    }}
                  >
                    <div className="absolute top-0 left-0 w-[3px] bottom-0" style={{ background: ins.color }} />
                    <div className="flex items-start gap-3 pl-2">
                      <span
                        className="font-mono text-base leading-none mt-0.5 flex-shrink-0"
                        style={{ color: ins.color }}
                      >
                        {ins.icon}
                      </span>
                      <div>
                        <p
                          className="font-mono text-[10px] tracking-widest uppercase mb-1"
                          style={{ color: ins.color }}
                        >
                          {ins.title}
                        </p>
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {ins.body}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex items-center justify-between pt-6"
            style={{ borderTop: "1px solid var(--shell-border)" }}
          >
            <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              Generated by Enterprise Hub · Claude Sonnet · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="flex items-center gap-3">
              <button
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-colors"
                style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--ink)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Export PDF
              </button>
              <button
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all hover:opacity-80"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Share ↗
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
}
