"use client";

import { useState }                                             from "react";
import { motion, AnimatePresence }                             from "framer-motion";
import IntentInput                                             from "@/components/reports/IntentInput";
import DataPlanConfirm, { buildPlanFromIntent, type ReportPlan } from "@/components/reports/DataPlanConfirm";
import LiveKitchen                                             from "@/components/reports/LiveKitchen";
import ReportView                                              from "@/components/reports/ReportView";
import { ALL_SYSTEMS, type SystemDef }                         from "@/components/reports/SystemSelector";

// ─── Saved reports ─────────────────────────────────────────────────────────────

type SavedReport = {
  id:      string;
  title:   string;
  subtitle:string;
  kpis:    string[];
  date:    string;
  sources: string[];
  accent:  string;
};

const ACCENT_POOL = ["#F0A500", "#00A1E0", "#22C55E", "#C8341A", "#7C5CFF", "#4F6EF7"];

const INITIAL_SAVED: SavedReport[] = [
  {
    id:       "1",
    title:    "Q1 2026 — EMEA Sales Performance",
    subtitle: "Revenue · Pipeline · Win Rate · Fulfilment",
    kpis:     ["€3.84M", "2.4×", "22%", "94%"],
    date:     "Today, 09:14",
    sources:  ["SAP", "SF", "HUB"],
    accent:   "#F0A500",
  },
  {
    id:       "2",
    title:    "Pipeline Coverage vs Q4 Target",
    subtitle: "Opportunity · Forecast · Account",
    kpis:     ["89 opps", "€4.2M", "22%", "2.4×"],
    date:     "Yesterday, 16:45",
    sources:  ["SF", "HUB"],
    accent:   "#00A1E0",
  },
  {
    id:       "3",
    title:    "Delivery Performance — Jan–Mar 2026",
    subtitle: "SAP Delivery · Fulfilment Rate · Delays",
    kpis:     ["1,247 orders", "94%", "38 delayed", "−1.2 days"],
    date:     "2 Jun 2026",
    sources:  ["SAP"],
    accent:   "#22C55E",
  },
];

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = "intent" | "plan" | "kitchen" | "report";

const STEP_ORDER:  Step[]              = ["intent", "plan", "kitchen", "report"];
const STEP_LABELS: Record<Step,string> = { intent: "Define", plan: "Confirm", kitchen: "Build", report: "Report" };

// ─── Step bar ─────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="9" height="8" viewBox="0 0 10 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4.5L3.5 7L9 1.5" />
    </svg>
  );
}

function StepBar({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div
      className="flex items-center justify-center px-4 py-2.5 overflow-hidden"
      style={{ borderBottom: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
    >
      {STEP_ORDER.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1.5 px-2 sm:px-3">
              <span
                className="font-mono text-[10px] w-4 h-4 flex items-center justify-center flex-shrink-0"
                style={{
                  background: done   ? "#22C55E"   : active ? "var(--ink)"   : "transparent",
                  color:      done   ? "#050609"   : active ? "var(--paper)" : "var(--text-muted)",
                  border:     !done && !active ? "1px solid var(--shell-border)" : "none",
                }}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              <span
                className={`font-mono text-[10px] tracking-widest uppercase ${active ? "inline" : "hidden sm:inline"}`}
                style={{ color: active ? "var(--text-primary)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STEP_ORDER.length - 1 && (
              <span className="font-mono text-[10px] mx-0.5 sm:mx-1" style={{ color: "var(--shell-border)" }}>·</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Saved report card ────────────────────────────────────────────────────────

function SavedReportCard({
  report,
  index,
  onOpen,
  onDelete,
}: {
  report:   SavedReport;
  index:    number;
  onOpen:   () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden group cursor-pointer"
      style={{ border: "1px solid var(--shell-border)", background: "var(--shell-surface)" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onOpen}
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: report.accent }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-[15px] font-semibold leading-snug mb-1 truncate" style={{ color: "var(--text-primary)" }}>
              {report.title}
            </h3>
            <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              {report.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Source badges */}
            <div className="flex gap-1">
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
            {/* Delete / unsave */}
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
              style={{ color: "var(--text-muted)" }}
              title="Remove from saved"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mini KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
          {report.kpis.map((kpi, i) => (
            <div
              key={i}
              className="p-2 text-center"
              style={{ background: "var(--shell-bg)", border: "1px solid var(--shell-border)" }}
            >
              <p
                className="font-semibold text-[13px] leading-tight"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
              >
                {kpi}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            {report.date}
          </span>
          <span
            className="font-mono text-[10px] tracking-widest uppercase transition-opacity"
            style={{ color: "var(--text-primary)", opacity: hovering ? 1 : 0 }}
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
  const [step,            setStep]            = useState<Step>("intent");
  const [intent,          setIntent]          = useState("");
  const [plan,            setPlan]            = useState<ReportPlan | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<SystemDef[]>([...ALL_SYSTEMS]);
  const [savedReports,    setSavedReports]    = useState<SavedReport[]>(INITIAL_SAVED);
  const [savedTitle,      setSavedTitle]      = useState<string | null>(null); // title of the report just saved

  const handleIntent = (text: string, systems: SystemDef[]) => {
    setIntent(text);
    setSelectedSystems(systems);
    setPlan(buildPlanFromIntent(text, systems));
    setSavedTitle(null);
    setStep("plan");
  };

  const handleConfirm = () => setStep("kitchen");
  const handleDone    = () => setStep("report");

  const handleRestart = () => {
    setStep("intent");
    setIntent("");
    setPlan(null);
    setSavedTitle(null);
    setSelectedSystems([...ALL_SYSTEMS]);
  };

  const handleSave = () => {
    if (!plan || savedTitle === plan.title) return; // already saved this one
    const now = new Date();
    const dateStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const accent  = ACCENT_POOL[savedReports.length % ACCENT_POOL.length];

    const newReport: SavedReport = {
      id:       String(Date.now()),
      title:    plan.title,
      subtitle: selectedSystems.map((s) => s.label).join(" · "),
      kpis:     ["€3.84M", "2.4×", "22%", "94%"], // same demo KPIs for all generated reports
      date:     `Today, ${dateStr}`,
      sources:  selectedSystems.slice(0, 3).map((s) => s.id.toUpperCase().slice(0, 3)),
      accent,
    };

    setSavedReports((prev) => [newReport, ...prev]);
    setSavedTitle(plan.title);
  };

  const handleDelete = (id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--shell-bg)" }}>

      {/* Step bar — hidden in report for full-canvas feel */}
      {step !== "report" && <StepBar current={step} />}

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {step === "intent" && (
            <motion.div
              key="intent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Builder */}
              <IntentInput onSubmit={handleIntent} />

              {/* Saved reports */}
              {savedReports.length > 0 && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
                  <div
                    className="pt-8 pb-4 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--shell-border)" }}
                  >
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                        ⬡ Saved Reports
                      </p>
                      <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        {savedReports.length} report{savedReports.length !== 1 ? "s" : ""} bookmarked
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    <div className="grid grid-cols-1 gap-4">
                      {savedReports.map((r, i) => (
                        <SavedReportCard
                          key={r.id}
                          report={r}
                          index={i}
                          onOpen={() => {
                            // Re-run builder with this report's title as intent
                            const newPlan = buildPlanFromIntent(r.title, [...ALL_SYSTEMS]);
                            setPlan(newPlan);
                            setIntent(r.title);
                            setSavedTitle(r.title);
                            setStep("kitchen");
                          }}
                          onDelete={() => handleDelete(r.id)}
                        />
                      ))}
                    </div>
                  </AnimatePresence>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center"
                  >
                    <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Powered by Hub AI · SAP · Salesforce · Hub Context · Reports generated fresh on demand
                    </p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {step === "plan" && plan && (
            <motion.div
              key="plan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <DataPlanConfirm
                plan={plan}
                onConfirm={handleConfirm}
                onEdit={() => setStep("intent")}
              />
            </motion.div>
          )}

          {step === "kitchen" && plan && (
            <motion.div
              key="kitchen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="p-6"
            >
              <LiveKitchen
                title={plan.title}
                selectedSystems={selectedSystems}
                onDone={handleDone}
              />
            </motion.div>
          )}

          {step === "report" && plan && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ReportView
                title={plan.title}
                onRestart={handleRestart}
                onSave={handleSave}
                isSaved={savedTitle === plan.title}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
