"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntentInput                    from "@/components/reports/IntentInput";
import DataPlanConfirm, { buildPlanFromIntent, type ReportPlan } from "@/components/reports/DataPlanConfirm";
import LiveKitchen                    from "@/components/reports/LiveKitchen";
import ReportView                     from "@/components/reports/ReportView";

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "intent" | "plan" | "kitchen" | "report";

const STEP_LABELS: Record<Step, string> = {
  intent:  "Define",
  plan:    "Confirm",
  kitchen: "Build",
  report:  "Report",
};

const STEP_ORDER: Step[] = ["intent", "plan", "kitchen", "report"];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <div
      className="flex items-center justify-center gap-0 mb-0"
      style={{
        borderBottom: "1px solid var(--shell-border)",
        background:   "var(--shell-surface)",
        padding:      "10px 24px",
      }}
    >
      {STEP_ORDER.map((step, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const future  = i > idx;

        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1.5 px-3">
              <span
                className="font-mono text-[10px] w-4 h-4 flex items-center justify-center"
                style={{
                  background: done   ? "#22C55E"
                            : active ? "var(--ink)"
                            : "transparent",
                  color:      done   ? "#050609"
                            : active ? "var(--paper)"
                            : "var(--text-muted)",
                  border:     future ? "1px solid var(--shell-border)" : "none",
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className="font-mono text-[10px] tracking-widest uppercase"
                style={{
                  color: active ? "var(--ink)" : "var(--text-muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STEP_ORDER.length - 1 && (
              <span
                className="font-mono text-[10px] mx-1"
                style={{ color: "var(--shell-border)" }}
              >
                ·
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const [step,   setStep]   = useState<Step>("intent");
  const [intent, setIntent] = useState("");
  const [plan,   setPlan]   = useState<ReportPlan | null>(null);

  const handleIntent = (text: string) => {
    setIntent(text);
    setPlan(buildPlanFromIntent(text));
    setStep("plan");
  };

  const handleConfirm = () => setStep("kitchen");
  const handleDone    = () => setStep("report");
  const handleRestart = () => { setStep("intent"); setIntent(""); setPlan(null); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
      {/* Step bar — hidden in report view for full-canvas feel */}
      {step !== "report" && <StepBar current={step} />}

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {step === "intent" && (
            <motion.div
              key="intent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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
              transition={{ duration: 0.3 }}
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
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              <LiveKitchen title={plan.title} onDone={handleDone} />
            </motion.div>
          )}

          {step === "report" && plan && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ReportView title={plan.title} onRestart={handleRestart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
