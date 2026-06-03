"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NodeStatus, SourceNode, SimEvent } from "@/lib/reports/types";

// ─── Source node definitions ─────────────────────────────────────────────────

const SOURCES: SourceNode[] = [
  {
    id:       "sap",
    label:    "SAP S/4HANA",
    sublabel: "Orders · Delivery · Finance",
    color:    "#F0A500",
    glow:     "rgba(240,165,0,0.35)",
    symbol:   "SAP",
  },
  {
    id:       "salesforce",
    label:    "Salesforce",
    sublabel: "Opps · Accounts · Forecast",
    color:    "#00A1E0",
    glow:     "rgba(0,161,224,0.35)",
    symbol:   "SF",
  },
  {
    id:       "context",
    label:    "Hub Context",
    sublabel: "Role · Calendar · Activity",
    color:    "#C8341A",
    glow:     "rgba(200,52,26,0.35)",
    symbol:   "HUB",
  },
];

// ─── Simulation script ────────────────────────────────────────────────────────

const SCRIPT: SimEvent[] = [
  { t: 300,   type: "narrate",      text: "⬡  Initialising Enterprise Hub data pipeline…" },
  { t: 900,   type: "activate",     nodeId: "sap" },
  { t: 1300,  type: "narrate",      text: "►  Connecting to SAP S/4HANA via secure API tunnel…" },
  { t: 2400,  type: "narrate",      text: "✓  Connected.  Querying SD module — Orders Jan–Mar 2026" },
  { t: 3500,  type: "narrate",      text: "⬡  Found 1,247 orders.  Extracting: OrderDate · NetValue · Region · DeliveryStatus" },
  { t: 4200,  type: "complete",     nodeId: "sap",         progress: 28 },
  { t: 4500,  type: "activate",     nodeId: "salesforce" },
  { t: 4900,  type: "narrate",      text: "►  Connecting to Salesforce via OAuth 2.0…" },
  { t: 5800,  type: "narrate",      text: "✓  Connected.  Querying Opportunities — Q1 2026, all stages" },
  { t: 6800,  type: "narrate",      text: "⬡  Found 89 opportunities · Total €4.2M · 12 closed-won · Win rate 22 %" },
  { t: 7500,  type: "complete",     nodeId: "salesforce",  progress: 56 },
  { t: 7800,  type: "activate",     nodeId: "context" },
  { t: 8200,  type: "narrate",      text: "►  Loading Hub context — role permissions · calendar · recent activity…" },
  { t: 9000,  type: "complete",     nodeId: "context",     progress: 72 },
  { t: 9000,  type: "narrate",      text: "⬡  Context: EMEA Sales Manager · YTD filter · 14 connected systems" },
  { t: 9400,  type: "brain-peak" },
  { t: 9400,  type: "narrate",      text: "✦  Claude is cross-referencing all sources and computing KPIs…" },
  { t: 10600, type: "narrate",      text: "✦  Fulfilment Rate · Pipeline Coverage · Win Rate · Avg Deal Size  —  calculated" },
  { t: 11500, type: "report-build", progress: 86 },
  { t: 11500, type: "narrate",      text: "⬡  Building visualisations: region breakdown · trend lines · pipeline funnel…" },
  { t: 12400, type: "narrate",      text: "✦  Writing AI insights — 3 key findings identified" },
  { t: 13200, type: "done",         progress: 100 },
  { t: 13200, type: "narrate",      text: "✓  Report complete — 1,336 data points · 4 KPIs · 3 charts · 2 AI insights" },
];

// ─── Node card ────────────────────────────────────────────────────────────────

function SourceCard({
  node,
  status,
  index,
}: {
  node: SourceNode;
  status: NodeStatus;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: "easeOut" }}
      className="relative w-56 rounded-sm overflow-hidden"
      style={{
        background:  "#0C0D11",
        border:      `1px solid ${status === "idle" ? "#2a2a2a" : node.color}`,
        boxShadow:   status !== "idle" ? `0 0 20px ${node.glow}, 0 0 40px ${node.glow}` : "none",
        transition:  "box-shadow 0.6s ease, border-color 0.4s ease",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: node.color, opacity: status === "idle" ? 0.3 : 1 }}
      />

      <div className="px-4 py-3 pl-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-mono text-[10px] font-bold tracking-widest"
            style={{ color: node.color, opacity: status === "idle" ? 0.5 : 1 }}
          >
            {node.symbol}
          </span>

          {/* Status dot */}
          <StatusDot status={status} color={node.color} />
        </div>

        <p
          className="text-[13px] font-semibold leading-tight"
          style={{ color: status === "idle" ? "#555" : "#e8e8e8" }}
        >
          {node.label}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: "#555" }}>
          {status === "extracting" ? "Extracting data…" : status === "done" ? node.sublabel : node.sublabel}
        </p>
      </div>

      {/* Scan line animation when extracting */}
      {status === "extracting" && (
        <motion.div
          className="absolute inset-x-0 h-[1px] opacity-40"
          style={{ background: `linear-gradient(90deg, transparent, ${node.color}, transparent)` }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

function StatusDot({ status, color }: { status: NodeStatus; color: string }) {
  if (status === "idle")
    return <span className="w-2 h-2 rounded-full bg-[#333]" />;
  if (status === "done")
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-[11px]"
        style={{ color: "#22C55E" }}
      >
        ✓
      </motion.span>
    );
  return (
    <motion.span
      className="w-2 h-2 rounded-full inline-block"
      style={{ background: color }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  );
}

// ─── Claude Brain ─────────────────────────────────────────────────────────────

function ClaudeBrain({ isPeaking, isActive }: { isPeaking: boolean; isActive: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      {/* Outer glow rings */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full border border-white/10"
            style={{ width: 140, height: 140 }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full border border-white/10"
            style={{ width: 140, height: 140 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Spinning outer ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 130, height: 130,
          border: "1px dashed rgba(255,255,255,0.15)",
        }}
        animate={{ rotate: isActive ? 360 : 0 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Main circle */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center rounded-full"
        style={{
          width: 100, height: 100,
          background: isPeaking
            ? "radial-gradient(circle, #2a2a40 0%, #0a0b10 100%)"
            : "radial-gradient(circle, #1a1a25 0%, #0a0b10 100%)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          boxShadow: isPeaking
            ? "0 0 30px rgba(255,255,255,0.25), 0 0 60px rgba(255,255,255,0.1), inset 0 0 30px rgba(255,255,255,0.05)"
            : "0 0 15px rgba(255,255,255,0.08)",
        }}
        animate={isPeaking ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 0.8, repeat: isPeaking ? Infinity : 0 }}
      >
        <span className="font-mono text-[9px] tracking-[0.3em] text-white/40 uppercase">Claude</span>
        {/* Hex grid pattern */}
        <motion.div
          className="mt-1 font-mono text-[18px] text-white/60"
          animate={{ opacity: isActive ? [0.4, 1, 0.4] : 0.2 }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          ⬡
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Report preview panel ─────────────────────────────────────────────────────

function ReportPreview({ buildProgress, isComplete, onOpen }: {
  buildProgress: number;
  isComplete: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity:  buildProgress > 0 ? 1 : 0.15,
        scale:    buildProgress > 0 ? 1 : 0.92,
        filter:   isComplete ? "blur(0px)" : `blur(${Math.max(0, 6 - buildProgress / 15)}px)`,
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden rounded-sm cursor-pointer"
      style={{
        width: 280, height: 190,
        background: "#0C0D11",
        border: `1px solid ${isComplete ? "#22C55E" : "#2a2a2a"}`,
        boxShadow: isComplete
          ? "0 0 25px rgba(34,197,94,0.3), 0 0 50px rgba(34,197,94,0.12)"
          : "none",
      }}
      onClick={isComplete ? onOpen : undefined}
    >
      {/* Skeleton report lines */}
      <div className="p-4 space-y-3">
        <div className="h-2 rounded-sm w-3/4" style={{ background: isComplete ? "#1e3a2a" : "#1a1a1a" }} />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {["#F0A500", "#00A1E0", "#22C55E", "#C8341A"].map((c, i) => (
            <div key={i} className="h-10 rounded-sm" style={{ background: isComplete ? c + "22" : "#141414" }}>
              <div className="h-full flex items-end justify-center pb-1">
                <motion.div
                  className="w-full mx-1 rounded-sm"
                  style={{ background: c + "66" }}
                  animate={isComplete ? { height: ["20%", `${[60, 85, 45, 70][i]}%`] } : { height: "20%" }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 mt-2">
          {[1, 0.7, 0.5].map((w, i) => (
            <div key={i} className="h-1.5 rounded-sm" style={{ background: "#1a1a1a", width: `${w * 100}%` }} />
          ))}
        </div>
        <div className="space-y-1">
          {[0.9, 0.6].map((w, i) => (
            <div key={i} className="h-1 rounded-sm" style={{ background: "#141414", width: `${w * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Build progress overlay */}
      {!isComplete && buildProgress > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(5,6,10,0.5)" }}>
          <div className="text-center">
            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-1">Building</div>
            <div className="font-mono text-white/60 text-sm">{buildProgress}%</div>
          </div>
        </div>
      )}

      {/* Complete badge */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 inset-x-0 py-1.5 text-center font-mono text-[10px] tracking-widest uppercase"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
        >
          View Report →
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── SVG paths + particles ────────────────────────────────────────────────────
// Canvas is 1200 × 600 (SVG viewBox). Node cards are placed at known centers.
// Source nodes: center-x ≈ 250 (right edge of card), y positions: 150, 300, 450
// Claude brain: center 640, 300
// Report: center-x ≈ 950, center-y 300

const SRC_RIGHT_X  = 226;  // right edge of source cards (in SVG units)
const CLAUDE_CX    = 640;
const CLAUDE_CY    = 300;
const REPORT_LEFT  = 780;

const SRC_CY: Record<string, number> = { sap: 150, salesforce: 300, context: 450 };

function buildPath(nodeId: string): string {
  const sy = SRC_CY[nodeId];
  const cx1 = SRC_RIGHT_X + (CLAUDE_CX - SRC_RIGHT_X) * 0.45;
  return `M ${SRC_RIGHT_X} ${sy} C ${cx1} ${sy} ${cx1} ${CLAUDE_CY} ${CLAUDE_CX - 50} ${CLAUDE_CY}`;
}

const BRAIN_TO_REPORT = `M ${CLAUDE_CX + 50} ${CLAUDE_CY} L ${REPORT_LEFT} ${CLAUDE_CY}`;

function FlowPaths({
  nodeStatuses,
  brainActive,
  reportBuilding,
}: {
  nodeStatuses: Record<string, NodeStatus>;
  brainActive: boolean;
  reportBuilding: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 600"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <defs>
        {SOURCES.map((src) => (
          <filter key={src.id} id={`glow-${src.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Source → brain paths */}
      {SOURCES.map((src) => {
        const status  = nodeStatuses[src.id] ?? "idle";
        const active  = status !== "idle";
        const pathD   = buildPath(src.id);
        const pathId  = `p-${src.id}`;

        return (
          <g key={src.id} style={{ opacity: active ? 1 : 0.15, transition: "opacity 0.6s" }}>
            {/* Static dashed line */}
            <path
              id={pathId}
              d={pathD}
              fill="none"
              stroke={src.color}
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity={0.35}
            />

            {/* Animated particles (only when active) */}
            {active && [0, 0.65, 1.3].map((delay, i) => (
              <circle key={i} r={i === 0 ? 4 : 3} fill={src.color} opacity={i === 0 ? 0.9 : 0.55} filter={`url(#glow-${src.id})`}>
                <animateMotion dur="2s" begin={`${delay}s`} repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        );
      })}

      {/* Brain → report path */}
      <g style={{ opacity: brainActive ? 1 : 0.1, transition: "opacity 0.6s" }}>
        <path
          id="p-brain-report"
          d={BRAIN_TO_REPORT}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity={0.3}
        />
        {brainActive && [0, 0.5, 1.0].map((delay, i) => (
          <circle key={i} r={4 - i} fill="#ffffff" opacity={0.7 - i * 0.2}>
            <animateMotion dur="1.4s" begin={`${delay}s`} repeatCount="indefinite">
              <mpath href="#p-brain-report" />
            </animateMotion>
          </circle>
        ))}
      </g>

      {/* Grid lines (subtle background) */}
      <g opacity="0.03" stroke="#ffffff" strokeWidth="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={600} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 100} x2={1200} y2={i * 100} />
        ))}
      </g>
    </svg>
  );
}

// ─── Narration bar ────────────────────────────────────────────────────────────

function NarrationBar({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  return (
    <div
      className="h-28 overflow-hidden font-mono text-[12px] leading-relaxed px-6 pt-3 pb-2 select-none"
      style={{ background: "#05060A", borderTop: "1px solid #1a1a1a" }}
    >
      <AnimatePresence initial={false}>
        {lines.slice(-5).map((line, i) => (
          <motion.p
            key={line + i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: i === lines.length - 1 || i === 4 ? 1 : 0.35, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ color: line.startsWith("✓") ? "#22C55E" : line.startsWith("✦") ? "#a78bfa" : "#888" }}
          >
            {line}
          </motion.p>
        ))}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface LiveKitchenProps {
  title:   string;
  onDone:  () => void;
}

export default function LiveKitchen({ title, onDone }: LiveKitchenProps) {
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({
    sap: "idle", salesforce: "idle", context: "idle",
  });
  const [brainActive,   setBrainActive]   = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [isComplete,    setIsComplete]    = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [narration,     setNarration]     = useState<string[]>([]);
  const [elapsed,       setElapsed]       = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activate = useCallback((nodeId: string) => {
    setNodeStatuses((p) => ({ ...p, [nodeId]: "extracting" }));
  }, []);

  const complete = useCallback((nodeId: string) => {
    setNodeStatuses((p) => ({ ...p, [nodeId]: "done" }));
  }, []);

  const addLine = useCallback((text: string) => {
    setNarration((p) => [...p, text]);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Date.now() - start), 100);

    SCRIPT.forEach((ev) => {
      const t = setTimeout(() => {
        switch (ev.type) {
          case "activate":     if (ev.nodeId) activate(ev.nodeId); break;
          case "complete":
            if (ev.nodeId) complete(ev.nodeId);
            if (ev.progress != null) setProgress(ev.progress);
            break;
          case "brain-peak":   setBrainActive(true); break;
          case "report-build":
            setReportProgress(ev.progress ?? 80);
            break;
          case "narrate":      if (ev.text) addLine(ev.text); break;
          case "done":
            setProgress(100);
            setReportProgress(100);
            setIsComplete(true);
            clearInterval(tick);
            break;
        }
      }, ev.t);
      timers.current.push(t);
    });

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      clearInterval(tick);
    };
  }, [activate, complete, addLine]);

  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <div
      className="flex flex-col rounded-sm overflow-hidden select-none"
      style={{ background: "#07080D", border: "1px solid #1a1b23", minHeight: 560 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: "#05060A", borderBottom: "1px solid #151619" }}
      >
        <div className="flex items-center gap-3">
          <motion.span
            className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"
            animate={!isComplete ? { opacity: [1, 0.3, 1] } : { opacity: 1, backgroundColor: "#22C55E" }}
            transition={{ duration: 0.9, repeat: !isComplete ? Infinity : 0 }}
          />
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
            {isComplete ? "Complete" : "Live"}
          </span>
          <span className="font-mono text-[11px] text-white/60 truncate max-w-xs">{title}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono text-[11px] text-white/25">{elapsedSec}s</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #C8341A, #F0A500, #22C55E)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="font-mono text-[10px] text-white/30 w-8">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Main canvas */}
      <div className="relative flex-1" style={{ minHeight: 360 }}>
        {/* Flow paths SVG */}
        <FlowPaths
          nodeStatuses={nodeStatuses}
          brainActive={brainActive}
          reportBuilding={reportProgress > 0}
        />

        {/* Source nodes — left column */}
        <div
          className="absolute flex flex-col justify-around"
          style={{ left: 24, top: 40, bottom: 40, width: 224 }}
        >
          {SOURCES.map((src, i) => (
            <SourceCard
              key={src.id}
              node={src}
              status={nodeStatuses[src.id] ?? "idle"}
              index={i}
            />
          ))}
        </div>

        {/* Claude brain — center */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top:  "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <ClaudeBrain
            isPeaking={brainActive}
            isActive={Object.values(nodeStatuses).some((s) => s !== "idle")}
          />
        </div>

        {/* Report preview — right */}
        <div
          className="absolute"
          style={{
            right: 24,
            top:   "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ReportPreview
            buildProgress={reportProgress}
            isComplete={isComplete}
            onOpen={onDone}
          />
        </div>

        {/* Column labels */}
        {(["Data Sources", "AI Processing", "Your Report"] as const).map((label, i) => (
          <div
            key={label}
            className="absolute top-3 font-mono text-[9px] tracking-widest uppercase text-white/20"
            style={{ left: [28, "50%", "auto"][i] as string | number, right: i === 2 ? 28 : "auto",
              transform: i === 1 ? "translateX(-50%)" : "none" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Narration */}
      <NarrationBar lines={narration} />

      {/* Done CTA */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: "rgba(34,197,94,0.06)", borderTop: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="font-mono text-[11px] text-green-400/70">
              Report ready — click the preview or open below
            </p>
            <button
              onClick={onDone}
              className="font-mono text-[11px] tracking-widest uppercase px-5 py-2 transition-all"
              style={{
                background: "#22C55E",
                color:      "#050609",
                fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#16a34a")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#22C55E")}
            >
              Open Report →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
