"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Cell,
  FunnelChart, Funnel,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import { useBrandColors } from "@/hooks/useBrandColors";
import BrandColors from "./BrandColors";

// ─── Simulated data ───────────────────────────────────────────────────────────

const KPI_DATA = [
  {
    label:     "Total Revenue",
    value:     "€3.84M",
    delta:     "+12%",
    positive:  true,
    sparkline: [2.8, 3.1, 2.9, 3.3, 3.6, 3.84],
  },
  {
    label:     "Pipeline Coverage",
    value:     "2.4×",
    delta:     "+0.3×",
    positive:  true,
    sparkline: [1.8, 1.9, 2.0, 2.1, 2.3, 2.4],
  },
  {
    label:     "Win Rate",
    value:     "22%",
    delta:     "−3 pp",
    positive:  false,
    sparkline: [27, 26, 25, 24, 23, 22],
  },
  {
    label:     "Fulfilment Rate",
    value:     "94.2%",
    delta:     "+1.8%",
    positive:  true,
    sparkline: [91, 91.5, 92.5, 93, 93.8, 94.2],
  },
];

const REGION_DATA = [
  { region: "DACH",   revenue: 1480, target: 1400, gap: 80  },
  { region: "UK",     revenue: 860,  target: 900,  gap: -40 },
  { region: "Benelux",revenue: 640,  target: 600,  gap: 40  },
  { region: "France", revenue: 530,  target: 550,  gap: -20 },
  { region: "Nordics",revenue: 330,  target: 300,  gap: 30  },
];

const TREND_DATA = [
  { month: "Oct", cur: 920,  prev: 810 },
  { month: "Nov", cur: 1050, prev: 890 },
  { month: "Dec", cur: 1320, prev: 1100 },
  { month: "Jan", cur: 1040, prev: 980 },
  { month: "Feb", cur: 1280, prev: 1050 },
  { month: "Mar", cur: 1460, prev: 1190 },
];

const FUNNEL_DATA = [
  { name: "Prospecting",  value: 89 },
  { name: "Qualification",value: 54 },
  { name: "Proposal",     value: 31 },
  { name: "Negotiation",  value: 18 },
  { name: "Closed Won",   value: 12 },
];

// Scatter: x = deal value (€K), y = win probability (%)
const SCATTER_DATA = [
  { x: 45,  y: 75, r: 3, label: "Müller AG"     },
  { x: 120, y: 60, r: 4, label: "BMW"            },
  { x: 285, y: 40, r: 5, label: "Siemens"        },
  { x: 80,  y: 82, r: 3, label: "Bosch"          },
  { x: 390, y: 25, r: 6, label: "VW Group"       },
  { x: 55,  y: 70, r: 3, label: "Deutsche Bahn"  },
  { x: 210, y: 55, r: 4, label: "Bayer"          },
  { x: 160, y: 65, r: 4, label: "BASF"           },
  { x: 310, y: 35, r: 5, label: "Continental"    },
  { x: 95,  y: 78, r: 3, label: "Merck"          },
];

// Opportunities table with Salesforce deep links
const OPPORTUNITIES = [
  { id: "006DACH0001", name: "DACH Q2 Platform Expansion",   account: "Müller GmbH",     value: 285000,  stage: "Proposal",     prob: 65, owner: "L. Schmidt",  sfInstance: "https://enterprise.salesforce.com" },
  { id: "006DACH0002", name: "BMW Digital Ops Suite",         account: "BMW AG",          value: 420000,  stage: "Negotiation",  prob: 80, owner: "T. Bauer",    sfInstance: "https://enterprise.salesforce.com" },
  { id: "006UK0003",   name: "UK Retail Analytics Platform",  account: "Tesco PLC",       value: 178000,  stage: "Qualification",prob: 40, owner: "J. Williams", sfInstance: "https://enterprise.salesforce.com" },
  { id: "006NL0004",   name: "Benelux ERP Integration",       account: "Philips NV",      value: 312000,  stage: "Proposal",     prob: 55, owner: "M. de Vries",  sfInstance: "https://enterprise.salesforce.com" },
  { id: "006FR0005",   name: "France Supply Chain AI",        account: "L'Oréal SA",      value: 195000,  stage: "Closed Won",   prob: 100,owner: "C. Martin",   sfInstance: "https://enterprise.salesforce.com" },
];

// SAP orders with deep links
const TOP_ORDERS = [
  { id: "0000001247", customer: "BMW AG",            value: 142000, status: "Delivered",   region: "DACH",    sapUrl: "/sap/bc/gui/sap/its/webgui?~transaction=VA03&VBELN=0000001247" },
  { id: "0000001201", customer: "Müller GmbH",       value: 98000,  status: "In Transit",  region: "DACH",    sapUrl: "/sap/bc/gui/sap/its/webgui?~transaction=VA03&VBELN=0000001201" },
  { id: "0000001188", customer: "Tesco PLC",         value: 76000,  status: "Delivered",   region: "UK",      sapUrl: "/sap/bc/gui/sap/its/webgui?~transaction=VA03&VBELN=0000001188" },
  { id: "0000001165", customer: "Philips NV",        value: 121000, status: "Delayed",     region: "Benelux", sapUrl: "/sap/bc/gui/sap/its/webgui?~transaction=VA03&VBELN=0000001165" },
  { id: "0000001102", customer: "L'Oréal SA",        value: 89000,  status: "Delivered",   region: "France",  sapUrl: "/sap/bc/gui/sap/its/webgui?~transaction=VA03&VBELN=0000001102" },
];

const AI_INSIGHTS = [
  {
    kind:   "positive" as const,
    title:  "DACH outperforming target by 5.7%",
    body:   "DACH exceeded Q1 revenue target by €80K — deal velocity improved, average sales cycle fell from 34 to 28 days. Recommend replicating the DACH playbook in the UK to close the current −€40K shortfall.",
  },
  {
    kind:   "warning" as const,
    title:  "Win rate declining — mid-market pressure",
    body:   "Win rate fell 3 pp YoY (25% → 22%), concentrated in €200K–500K deals against two key competitors. Recommend refreshing competitive battle cards and introducing executive sponsor programmes for mid-market pursuits.",
  },
];

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

function ArrowUpRight({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 9.5L9.5 2.5M4 2.5h5.5v5.5" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="12" viewBox="0 0 14 13" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L13 12H1L7 1z" />
      <path d="M7 5v3M7 10v.5" strokeWidth="1.8" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10L10 2M6 2h4v4" />
      <path d="M10 7v3H2V4h3" />
    </svg>
  );
}

function HexIcon({ size = 11, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" />
    </svg>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, formatter }: { active?: boolean; payload?: readonly any[]; label?: string | number; formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const fmt = formatter ?? ((v: number) => `€${v.toLocaleString()}`);
  return (
    <div className="px-3 py-2 font-mono text-[11px] leading-relaxed" style={{ background: "var(--ink)", color: "var(--paper)", border: "none" }}>
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: (p.color as string) ?? "#ccc" }}>{p.name as string}: {fmt(p.value as number)}</p>
      ))}
    </div>
  );
}

// ─── KPI tile with sparkline ──────────────────────────────────────────────────

function KpiTile({ kpi, color, index }: { kpi: typeof KPI_DATA[0]; color: string; index: number }) {
  const sparkData = kpi.sparkline.map((v, i) => ({ v, i }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden p-4"
      style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
    >
      <div className="absolute top-0 left-0 w-[3px] bottom-0" style={{ background: color }} />

      <p className="font-mono text-[10px] tracking-widest uppercase mb-2 pl-2" style={{ color: "var(--text-muted)" }}>
        {kpi.label}
      </p>
      <div className="flex items-end justify-between pl-2">
        <div>
          <span
            className="text-2xl font-bold leading-none block"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}
          >
            {kpi.value}
          </span>
          <span
            className="font-mono text-[11px] font-semibold mt-0.5 block"
            style={{ color: kpi.positive ? "#22C55E" : "#ef4444" }}
          >
            {kpi.delta} vs prev qtr
          </span>
        </div>

        {/* Sparkline */}
        <div style={{ width: 64, height: 32 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, source, delay, children, actions,
}: {
  title:    string;
  source:   string;
  delay:    number;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
        <div className="flex items-center gap-4">
          {actions}
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>{source}</span>
        </div>
      </div>
      <div className="p-5" style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ─── Stage pill ───────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  "Closed Won":   "#22C55E",
  "Negotiation":  "#F0A500",
  "Proposal":     "#00A1E0",
  "Qualification":"#7C3AED",
  "Prospecting":  "#64748b",
};

function StagePill({ stage }: { stage: string }) {
  const c = STAGE_COLORS[stage] ?? "#888";
  return (
    <span
      className="font-mono text-[9px] px-2 py-0.5 font-semibold"
      style={{ background: c + "18", color: c, border: `1px solid ${c}44` }}
    >
      {stage}
    </span>
  );
}

function OrderStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Delivered":  "#22C55E",
    "In Transit": "#00A1E0",
    "Delayed":    "#ef4444",
  };
  const c = map[status] ?? "#888";
  return (
    <span className="font-mono text-[9px] px-2 py-0.5" style={{ background: c + "18", color: c, border: `1px solid ${c}44` }}>
      {status}
    </span>
  );
}

// ─── Filter / toolbar ─────────────────────────────────────────────────────────

const THEMES = [
  { id: "editorial", label: "Editorial" },
  { id: "midnight",  label: "Midnight"  },
  { id: "signal",    label: "Signal"    },
];

function FilterBar({
  theme,
  onTheme,
  onRestart,
}: {
  theme:     string;
  onTheme:   (t: string) => void;
  onRestart: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div
      className="mb-6"
      style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
    >
      {/* Main bar */}
      <div className="flex items-center justify-between px-5 py-3">
        {/* Left */}
        <div className="flex items-center gap-5">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Q1 2026 · EMEA Sales Manager
          </span>
          <span
            className="font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5"
            style={{ background: "#22C55E18", color: "#22C55E", border: "1px solid #22C55E44" }}
          >
            <svg width="7" height="7" viewBox="0 0 8 8" fill="#22C55E"><circle cx="4" cy="4" r="3" /></svg>
            Simulated data
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Brand colors toggle */}
          <button
            onClick={() => setPaletteOpen((p) => !p)}
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            style={{
              border:     `1px solid ${paletteOpen ? "var(--ink)" : "var(--shell-border)"}`,
              color:      paletteOpen ? "var(--ink)" : "var(--text-muted)",
              background: paletteOpen ? "var(--ink)08" : "transparent",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="6" cy="6" r="5" />
              <circle cx="3.5" cy="5" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="6"   cy="3" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="8.5" cy="5" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="6"   cy="8" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            Brand colors
          </button>

          {/* Theme switcher */}
          <div className="flex items-center gap-0.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => onTheme(t.id)}
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1.5 transition-all"
                style={{
                  background: theme === t.id ? "var(--ink)" : "transparent",
                  color:      theme === t.id ? "var(--paper)" : "var(--text-muted)",
                  border:     `1px solid ${theme === t.id ? "var(--ink)" : "var(--shell-border)"}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={onRestart}
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 transition-colors"
            style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
          >
            + New Report
          </button>
        </div>
      </div>

      {/* Expanded palette editor */}
      {paletteOpen && (
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--shell-border)", background: "var(--paper)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Company Brand Colors — used across all charts in this report
            </p>
          </div>
          <BrandColors />
        </div>
      )}
    </div>
  );
}

// ─── Theme CSS injection ──────────────────────────────────────────────────────

const MIDNIGHT_CSS = `
.rpt-midnight {
  --ink: #e8e8e8; --paper: #07080D; --shell-surface: #0C0D11;
  --shell-border: #1e1f27; --text-secondary: #888; --text-muted: #555;
  --active-bg: rgba(255,255,255,0.06); --active-text: #e8e8e8;
  --hover-bg: rgba(255,255,255,0.04); background: #07080D; color: #e8e8e8;
}`;
const SIGNAL_CSS = `
.rpt-signal {
  --ink: #0A1628; --paper: #EEF4FF; --shell-surface: #E4EFFF;
  --shell-border: #C0D6F5; --text-secondary: #4A6080; --text-muted: #7A95B0;
  background: #EEF4FF; color: #0A1628;
}`;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportView({ title, onRestart }: { title: string; onRestart: () => void }) {
  const [theme, setTheme] = useState("editorial");
  const { colors }        = useBrandColors();

  const themeClass =
    theme === "midnight" ? "rpt-midnight"
    : theme === "signal" ? "rpt-signal"
    : "";

  // Chart color helpers
  const c = (i: number) => colors[i % colors.length];

  // Donut data
  const donutData = [
    { name: "Won",  value: 22 },
    { name: "Lost", value: 78 },
  ];

  return (
    <>
      <style>{MIDNIGHT_CSS}{SIGNAL_CSS}</style>

      <div className={`${themeClass} transition-colors duration-500 min-h-screen`}>
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Report header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <HexIcon size={11} color="var(--text-muted)" />
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--text-muted)" }}>
                AI-Generated Report · Q1 2026
              </span>
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

          {/* ── KPI Row ─────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-4 gap-3 mb-6"
          >
            {KPI_DATA.map((kpi, i) => (
              <KpiTile key={kpi.label} kpi={kpi} color={c(i)} index={i} />
            ))}
          </motion.div>

          {/* ── Row 1: Region bar + Donut ────────────────────────────── */}
          <div className="grid grid-cols-5 gap-4 mb-6">

            {/* Region stacked bar — 3/5 */}
            <div className="col-span-3">
              <Section title="Revenue by Region" source="SAP S/4HANA · SD Module" delay={0.18}>
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={REGION_DATA} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" vertical={false} />
                    <XAxis dataKey="region" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}K`} />
                    <Tooltip content={(p) => <ChartTooltip {...p} formatter={(v) => `€${v}K`} />} cursor={{ fill: "rgba(128,128,128,0.06)" }} />
                    <Bar dataKey="revenue" name="Revenue" fill={c(0)} radius={[2,2,0,0]} maxBarSize={28}>
                      {REGION_DATA.map((_, i) => (
                        <Cell key={i} fill={c(0)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                    <Bar dataKey="target" name="Target" fill={c(0)} radius={[2,2,0,0]} maxBarSize={28}>
                      {REGION_DATA.map((_, i) => (
                        <Cell key={i} fill={c(0)} fillOpacity={0.22} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="gap" name="vs Target" stroke={c(2)} strokeWidth={2} dot={{ r: 3, fill: c(2) }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Win rate donut — 2/5 */}
            <div className="col-span-2">
              <Section title="Win Rate" source="Salesforce" delay={0.22}>
                <div className="relative flex items-center justify-center" style={{ height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        innerRadius={62}
                        outerRadius={88}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                        isAnimationActive
                      >
                        <Cell fill={c(0)} />
                        <Cell fill={`${c(0)}22`} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute text-center pointer-events-none">
                    <p className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>22%</p>
                    <p className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>Win Rate</p>
                    <p className="font-mono text-[9px] mt-0.5" style={{ color: "#ef4444" }}>−3 pp YoY</p>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* ── Row 2: Area trend ──────────────────────────────────────── */}
          <div className="mb-6">
            <Section title="Revenue Trend vs Prior Year" source="SAP S/4HANA · SD Module" delay={0.28}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="grad-cur"  x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c(0)} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c(0)} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="grad-prev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c(1)} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={c(1)} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}K`} />
                  <Tooltip content={(p) => <ChartTooltip {...p} formatter={(v) => `€${v}K`} />} />
                  <Area type="monotone" dataKey="cur"  name="Q1 2026" stroke={c(0)} strokeWidth={2} fill="url(#grad-cur)"  dot={{ r: 3, fill: c(0) }} />
                  <Area type="monotone" dataKey="prev" name="Q1 2025" stroke={c(1)} strokeWidth={1.5} fill="url(#grad-prev)" dot={false} strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* ── Row 3: Scatter + Funnel ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 mb-6">

            {/* Deal scatter */}
            <Section title="Deal Size vs Win Probability" source="Salesforce · Opportunity" delay={0.35}>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
                  <XAxis
                    type="number" dataKey="x" name="Deal Value"
                    tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `€${v}K`}
                    label={{ value: "Deal value (€K)", position: "insideBottom", offset: -6, fontSize: 9, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    type="number" dataKey="y" name="Probability"
                    tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "var(--text-muted)" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <ZAxis dataKey="r" range={[40, 140]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3", stroke: "var(--text-muted)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as typeof SCATTER_DATA[0];
                      return (
                        <div className="px-3 py-2 font-mono text-[11px]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                          <p className="font-semibold">{d.label}</p>
                          <p style={{ color: c(0) }}>Value: €{d.x}K</p>
                          <p style={{ color: c(1) }}>Win prob: {d.y}%</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={SCATTER_DATA} fill={c(0)} fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </Section>

            {/* Pipeline funnel */}
            <Section title="Pipeline Funnel" source="Salesforce" delay={0.38}>
              <ResponsiveContainer width="100%" height={220}>
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
                    {FUNNEL_DATA.map((_, i) => (
                      <Cell key={i} fill={c(i)} />
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
            </Section>
          </div>

          {/* ── Salesforce opportunity table ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>Top Opportunities</h3>
              <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Salesforce CRM · Click row to open record
              </span>
            </div>
            <div style={{ border: "1px solid var(--shell-border)" }}>
              {/* Header */}
              <div
                className="grid font-mono text-[10px] tracking-widest uppercase px-4 py-2.5"
                style={{
                  gridTemplateColumns: "1fr 140px 100px 80px 80px 120px",
                  background:          "var(--shell-surface)",
                  borderBottom:        "1px solid var(--shell-border)",
                  color:               "var(--text-muted)",
                }}
              >
                <span>Opportunity</span>
                <span>Account</span>
                <span>Value</span>
                <span>Prob</span>
                <span>Stage</span>
                <span className="text-right">Owner</span>
              </div>
              {/* Rows */}
              {OPPORTUNITIES.map((opp, i) => (
                <a
                  key={opp.id}
                  href={`${opp.sfInstance}/lightning/r/Opportunity/${opp.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid items-center px-4 py-3 group transition-colors"
                  style={{
                    gridTemplateColumns: "1fr 140px 100px 80px 80px 120px",
                    borderBottom:        i < OPPORTUNITIES.length - 1 ? "1px solid var(--shell-border)" : "none",
                    background:          "var(--shell-surface)",
                    textDecoration:      "none",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover-bg)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--shell-surface)")}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{opp.name}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: c(1) }}>
                      <ExternalLinkIcon />
                    </span>
                  </div>
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{opp.account}</span>
                  <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
                    €{(opp.value / 1000).toFixed(0)}K
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: opp.prob >= 70 ? c(2) : opp.prob >= 40 ? c(0) : c(3) }}>
                    {opp.prob}%
                  </span>
                  <StagePill stage={opp.stage} />
                  <span className="text-[12px] text-right" style={{ color: "var(--text-muted)" }}>{opp.owner}</span>
                </a>
              ))}
            </div>
          </motion.div>

          {/* ── SAP orders table ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.49, duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>Top Orders</h3>
              <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                SAP S/4HANA · SD · Click to open transaction VA03
              </span>
            </div>
            <div style={{ border: "1px solid var(--shell-border)" }}>
              <div
                className="grid font-mono text-[10px] tracking-widest uppercase px-4 py-2.5"
                style={{
                  gridTemplateColumns: "130px 1fr 120px 90px 80px",
                  background:          "var(--shell-surface)",
                  borderBottom:        "1px solid var(--shell-border)",
                  color:               "var(--text-muted)",
                }}
              >
                <span>Order #</span>
                <span>Customer</span>
                <span>Value</span>
                <span>Region</span>
                <span>Status</span>
              </div>
              {TOP_ORDERS.map((order, i) => (
                <a
                  key={order.id}
                  href={order.sapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid items-center px-4 py-3 group transition-colors"
                  style={{
                    gridTemplateColumns: "130px 1fr 120px 90px 80px",
                    borderBottom:        i < TOP_ORDERS.length - 1 ? "1px solid var(--shell-border)" : "none",
                    background:          "var(--shell-surface)",
                    textDecoration:      "none",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover-bg)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--shell-surface)")}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]" style={{ color: c(0) }}>{order.id}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c(0) }}>
                      <ExternalLinkIcon />
                    </span>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{order.customer}</span>
                  <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
                    €{(order.value / 1000).toFixed(0)}K
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{order.region}</span>
                  <OrderStatusPill status={order.status} />
                </a>
              ))}
            </div>
          </motion.div>

          {/* ── AI Insights ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54, duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>AI Insights</h3>
              <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>Claude analysis</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {AI_INSIGHTS.map((ins, i) => {
                const color = ins.kind === "positive" ? c(2) : c(0);
                return (
                  <motion.div
                    key={ins.title}
                    initial={{ opacity: 0, x: i === 0 ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.58 + i * 0.08, duration: 0.4 }}
                    className="p-4 relative overflow-hidden"
                    style={{ border: `1px solid ${color}33`, background: `${color}08` }}
                  >
                    <div className="absolute top-0 left-0 w-[3px] bottom-0" style={{ background: color }} />
                    <div className="flex items-start gap-3 pl-2">
                      <span className="mt-0.5 flex-shrink-0">
                        {ins.kind === "positive"
                          ? <ArrowUpRight color={color} />
                          : <WarningIcon color={color} />
                        }
                      </span>
                      <div>
                        <p className="font-mono text-[10px] tracking-widest uppercase mb-1.5" style={{ color }}>
                          {ins.title}
                        </p>
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {ins.body}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="flex items-center justify-between pt-5"
            style={{ borderTop: "1px solid var(--shell-border)" }}
          >
            <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              Generated by Enterprise Hub · Claude Sonnet · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-colors flex items-center gap-2"
                style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M6 1v7M3 5l3 3 3-3M1 10h10" />
                </svg>
                Export PDF
              </button>
              <button
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80 flex items-center gap-2"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                <ExternalLinkIcon />
                Share
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  );
}
