"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntentInput                                   from "@/components/reports/IntentInput";
import DataPlanConfirm, { buildPlanFromIntent, type ReportPlan } from "@/components/reports/DataPlanConfirm";
import LiveKitchen                                   from "@/components/reports/LiveKitchen";
import ReportView                                    from "@/components/reports/ReportView";
import { ALL_SYSTEMS, type SystemDef }               from "@/components/reports/SystemSelector";

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = "intent" | "plan" | "kitchen" | "report";

const STEP_ORDER: Step[]                    = ["intent", "plan", "kitchen", "report"];
const STEP_LABELS: Record<Step, string>     = { intent: "Define", plan: "Confirm", kitchen: "Build", report: "Report" };

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
                  color:      done   ? "#050609"    : active ? "var(--paper)" : "var(--text-muted)",
                  border:     !done && !active ? "1px solid var(--shell-border)" : "none",
                }}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              {/* Show label always on sm+; on mobile show only active label */}
              <span
                className={`font-mono text-[10px] tracking-widest uppercase ${active ? "inline" : "hidden sm:inline"}`}
                style={{ color: active ? "var(--ink)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const [step,            setStep]            = useState<Step>("intent");
  const [intent,          setIntent]          = useState("");
  const [plan,            setPlan]            = useState<ReportPlan | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<SystemDef[]>([...ALL_SYSTEMS]);

  const handleIntent = (text: string, systems: SystemDef[]) => {
    setIntent(text);
    setSelectedSystems(systems);
    setPlan(buildPlanFromIntent(text, systems));
    setStep("plan");
  };

  const handleConfirm = () => setStep("kitchen");
  const handleDone    = () => setStep("report");
  const handleRestart = () => { setStep("intent"); setIntent(""); setPlan(null); setSelectedSystems([...ALL_SYSTEMS]); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
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
              <IntentInput onSubmit={handleIntent} />
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
              <ReportView title={plan.title} onRestart={handleRestart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
