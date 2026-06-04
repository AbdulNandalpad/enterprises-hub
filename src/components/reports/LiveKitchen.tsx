"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NodeStatus, SourceNode, SimEvent } from "@/lib/reports/types";
import type { SystemDef } from "./SystemSelector";

// ─── Source node definitions (full set) ──────────────────────────────────────

const SOURCE_DEFS: Record<string, SourceNode> = {
  sap: {
    id:       "sap",
    label:    "SAP S/4HANA",
    sublabel: "Orders · Delivery · Finance",
    color:    "#F0A500",
    glow:     "rgba(240,165,0,0.35)",
    symbol:   "SAP",
  },
  salesforce: {
    id:       "salesforce",
    label:    "Salesforce",
    sublabel: "Opps · Accounts · Forecast",
    color:    "#00A1E0",
    glow:     "rgba(0,161,224,0.35)",
    symbol:   "SF",
  },
  context: {
    id:       "context",
    label:    "Hub Context",
    sublabel: "Role · Calendar · Activity",
    color:    "#C8341A",
    glow:     "rgba(200,52,26,0.35)",
    symbol:   "HUB",
  },
};

// ─── Simulation script ────────────────────────────────────────────────────────

const SCRIPT: SimEvent[] = [
  { t: 300,   type: "narrate",      text: "HEX  Initialising Enterprise Hub data pipeline" },
  { t: 900,   type: "activate",     nodeId: "sap" },
  { t: 1300,  type: "narrate",      text: "PLAY  Connecting to SAP S/4HANA via secure API tunnel" },
  { t: 2400,  type: "narrate",      text: "CHECK  Connected.  Querying SD module — Orders Jan–Mar 2026" },
  { t: 3500,  type: "narrate",      text: "HEX  Found 1,247 orders.  Extracting: OrderDate · NetValue · Region · DeliveryStatus" },
  { t: 4200,  type: "complete",     nodeId: "sap",        progress: 28 },
  { t: 4500,  type: "activate",     nodeId: "salesforce" },
  { t: 4900,  type: "narrate",      text: "PLAY  Connecting to Salesforce via OAuth 2.0" },
  { t: 5800,  type: "narrate",      text: "CHECK  Connected.  Querying Opportunities — Q1 2026, all stages" },
  { t: 6800,  type: "narrate",      text: "HEX  Found 89 opportunities · Total €4.2M · 12 closed-won · Win rate 22 %" },
  { t: 7500,  type: "complete",     nodeId: "salesforce", progress: 56 },
  { t: 7800,  type: "activate",     nodeId: "context" },
  { t: 8200,  type: "narrate",      text: "PLAY  Loading Hub context — role permissions · calendar · recent activity" },
  { t: 9000,  type: "complete",     nodeId: "context",    progress: 72 },
  { t: 9000,  type: "narrate",      text: "HEX  Context: EMEA Sales Manager · YTD filter · 14 connected systems" },
  { t: 9400,  type: "brain-peak" },
  { t: 9400,  type: "narrate",      text: "STAR  Hub AI is cross-referencing all sources and computing KPIs" },
  { t: 10600, type: "narrate",      text: "STAR  Fulfilment Rate · Pipeline Coverage · Win Rate · Avg Deal Size  —  calculated" },
  { t: 11500, type: "report-build", progress: 86 },
  { t: 11500, type: "narrate",      text: "HEX  Building visualisations: region breakdown · trend lines · pipeline funnel" },
  { t: 12400, type: "narrate",      text: "STAR  Writing AI insights — 3 key findings identified" },
  { t: 13200, type: "done",         progress: 100 },
  { t: 13200, type: "narrate",      text: "CHECK  Report complete — 1,336 data points · 4 KPIs · 4 charts · 2 AI insights" },
];

// ─── Inline SVG icons (narration) ─────────────────────────────────────────────

function IconHex({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" />
    </svg>
  );
}

function IconPlay({ color }: { color: string }) {
  return (
    <svg width="10" height="11" viewBox="0 0 12 14" fill={color} style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M1 1.5L11 7L1 12.5V1.5z" />
    </svg>
  );
}

function IconCheck({ color }: { color: string }) {
  return (
    <svg width="11" height="9" viewBox="0 0 12 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M1 5L4.5 8.5L11 1" />
    </svg>
  );
}

function IconStar({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M8 1L9.8 6.2L15 8L9.8 9.8L8 15L6.2 9.8L1 8L6.2 6.2L8 1Z" />
    </svg>
  );
}

// ─── Narration line parser ────────────────────────────────────────────────────

type NarrationToken = { icon: "HEX" | "PLAY" | "CHECK" | "STAR" | null; text: string; color: string };

function parseLine(raw: string): NarrationToken {
  const map: Array<{ prefix: string; icon: NarrationToken["icon"]; color: string }> = [
    { prefix: "CHECK ", icon: "CHECK", color: "#22C55E" },
    { prefix: "STAR ",  icon: "STAR",  color: "#a78bfa" },
    { prefix: "PLAY ",  icon: "PLAY",  color: "#64748b" },
    { prefix: "HEX ",   icon: "HEX",   color: "#64748b" },
  ];
  for (const m of map) {
    if (raw.startsWith(m.prefix)) {
      return { icon: m.icon, text: raw.slice(m.prefix.length), color: m.color };
    }
  }
  return { icon: null, text: raw, color: "#64748b" };
}

function NarrationIcon({ token }: { token: NarrationToken }) {
  if (!token.icon) return null;
  if (token.icon === "CHECK") return <IconCheck color={token.color} />;
  if (token.icon === "STAR")  return <IconStar  color={token.color} />;
  if (token.icon === "PLAY")  return <IconPlay  color={token.color} />;
  if (token.icon === "HEX")   return <IconHex   color={token.color} />;
  return null;
}

// ─── Source card ──────────────────────────────────────────────────────────────

function StatusDot({ status, color }: { status: NodeStatus; color: string }) {
  if (status === "idle")
    return <span className="w-2 h-2 rounded-full" style={{ background: "#2a2a2a" }} />;
  if (status === "done")
    return (
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <svg width="11" height="9" viewBox="0 0 12 10" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 5L4.5 8.5L11 1" />
        </svg>
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

function SourceCard({
  node,
  status,
  index,
  isComplete,
}: {
  node:       SourceNode;
  status:     NodeStatus;
  index:      number;
  isComplete: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5, ease: "easeOut" }}
      className="relative w-56 overflow-hidden"
      style={{
        background:  "#0C0D11",
        border:      `1px solid ${status === "idle" ? "#2a2a2a" : node.color}`,
        boxShadow:   status !== "idle" ? `0 0 20px ${node.glow}, 0 0 40px ${node.glow}` : "none",
        transition:  "box-shadow 0.6s ease, border-color 0.4s ease",
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: node.color, opacity: status === "idle" ? 0.3 : 1 }}
      />

      <div className="px-4 py-3 pl-5">
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-mono text-[10px] font-bold tracking-widest"
            style={{ color: node.color, opacity: status === "idle" ? 0.5 : 1 }}
          >
            {node.symbol}
          </span>
          <StatusDot status={status} color={node.color} />
        </div>
        <p
          className="text-[13px] font-semibold leading-tight"
          style={{ color: status === "idle" ? "#555" : "#e8e8e8" }}
        >
          {node.label}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: "#555" }}>
          {status === "extracting" ? "Extracting data…" : node.sublabel}
        </p>
      </div>

      {/* Scan line — only when extracting AND not complete */}
      {status === "extracting" && !isComplete && (
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

// ─── Claude Brain ─────────────────────────────────────────────────────────────

function ClaudeBrain({
  isPeaking,
  isActive,
  isComplete,
}: {
  isPeaking:  boolean;
  isActive:   boolean;
  isComplete: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      {/* Glow rings — stop when complete */}
      {isActive && !isComplete && (
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
      {/* Static complete glow */}
      {isComplete && (
        <div
          className="absolute rounded-full"
          style={{ width: 140, height: 140, border: "1px solid rgba(34,197,94,0.25)", boxShadow: "0 0 30px rgba(34,197,94,0.15)" }}
        />
      )}

      {/* Spinning ring — stops (very slow) when complete */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 130, height: 130, border: "1px dashed rgba(255,255,255,0.15)" }}
        animate={{ rotate: isComplete ? 0 : 360 }}
        transition={
          isComplete
            ? { duration: 0 }
            : { duration: 8, repeat: Infinity, ease: "linear" }
        }
      />

      {/* Main circle */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center rounded-full"
        style={{
          width:      100,
          height:     100,
          background: isComplete
            ? "radial-gradient(circle, #1a2e1a 0%, #0a0b10 100%)"
            : isPeaking
            ? "radial-gradient(circle, #2a2a40 0%, #0a0b10 100%)"
            : "radial-gradient(circle, #1a1a25 0%, #0a0b10 100%)",
          border:     `1.5px solid ${isComplete ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.2)"}`,
          boxShadow:  isComplete
            ? "0 0 20px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.05)"
            : isPeaking
            ? "0 0 30px rgba(255,255,255,0.25), 0 0 60px rgba(255,255,255,0.1)"
            : "0 0 15px rgba(255,255,255,0.08)",
        }}
        animate={isPeaking && !isComplete ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, repeat: isPeaking && !isComplete ? Infinity : 0 }}
      >
        <span className="font-mono text-[9px] tracking-[0.3em] text-white/40 uppercase">Hub AI</span>
        <motion.div
          className="mt-1"
          animate={
            isComplete
              ? { opacity: 1 }
              : isActive
              ? { opacity: [0.4, 1, 0.4] }
              : { opacity: 0.2 }
          }
          transition={isComplete ? {} : { duration: 1.4, repeat: Infinity }}
        >
          {isComplete ? (
            <svg width="20" height="17" viewBox="0 0 22 18" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9L8.5 15.5L20 2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2">
              <path d="M8 1.5L14 5v6L8 14.5 2 11V5L8 1.5z" />
            </svg>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Report preview ───────────────────────────────────────────────────────────

function ReportPreview({
  buildProgress,
  isComplete,
  onOpen,
}: {
  buildProgress: number;
  isComplete:    boolean;
  onOpen:        () => void;
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
      className="relative overflow-hidden cursor-pointer"
      style={{
        width:     280,
        height:    190,
        background:"#0C0D11",
        border:    `1px solid ${isComplete ? "#22C55E" : "#2a2a2a"}`,
        boxShadow: isComplete ? "0 0 25px rgba(34,197,94,0.3), 0 0 50px rgba(34,197,94,0.12)" : "none",
      }}
      onClick={isComplete ? onOpen : undefined}
    >
      {/* Skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-2 w-3/4" style={{ background: isComplete ? "#1e3a2a" : "#1a1a1a" }} />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {["#F0A500","#00A1E0","#22C55E","#C8341A"].map((c, i) => (
            <div key={i} className="h-10" style={{ background: isComplete ? c + "22" : "#141414" }}>
              <div className="h-full flex items-end justify-center pb-1">
                <motion.div
                  className="w-full mx-1"
                  style={{ background: c + "66" }}
                  animate={isComplete ? { height: ["20%", `${[60,85,45,70][i]}%`] } : { height: "20%" }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 mt-2">
          {[1, 0.7, 0.5].map((w, i) => (
            <div key={i} className="h-1.5" style={{ background: "#1a1a1a", width: `${w * 100}%` }} />
          ))}
        </div>
        <div className="space-y-1">
          {[0.9, 0.6].map((w, i) => (
            <div key={i} className="h-1" style={{ background: "#141414", width: `${w * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Building overlay */}
      {!isComplete && buildProgress > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(5,6,10,0.5)" }}>
          <div className="text-center">
            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-1">Building</div>
            <div className="font-mono text-white/60 text-sm">{buildProgress}%</div>
          </div>
        </div>
      )}

      {/* Complete CTA */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 inset-x-0 py-2 text-center font-mono text-[10px] tracking-widest uppercase"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
        >
          Click to open report
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── SVG flow paths ────────────────────────────────────────────────────────────

const CLAUDE_CX   = 640;
const CLAUDE_CY   = 300;
const REPORT_LEFT = 780;

// Y positions for up to 3 source nodes — evenly spaced
function srcY(index: number, total: number): number {
  const spacing = 280 / Math.max(total - 1, 1);
  const start   = 300 - (spacing * (total - 1)) / 2;
  return start + index * spacing;
}

function FlowPaths({
  sources,
  nodeStatuses,
  brainActive,
  reportBuilding,
  isComplete,
}: {
  sources:       SourceNode[];
  nodeStatuses:  Record<string, NodeStatus>;
  brainActive:   boolean;
  reportBuilding:boolean;
  isComplete:    boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 600"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <defs>
        {sources.map((src) => (
          <filter key={src.id} id={`glow-${src.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Source → brain */}
      {sources.map((src, i) => {
        const status = nodeStatuses[src.id] ?? "idle";
        const active = status !== "idle";
        const sy     = srcY(i, sources.length);
        const cx1    = 226 + (CLAUDE_CX - 226) * 0.45;
        const pathD  = `M 226 ${sy} C ${cx1} ${sy} ${cx1} ${CLAUDE_CY} ${CLAUDE_CX - 50} ${CLAUDE_CY}`;
        const pathId = `p-${src.id}`;

        return (
          <g key={src.id} style={{ opacity: active ? 1 : 0.15, transition: "opacity 0.6s" }}>
            <path
              id={pathId}
              d={pathD}
              fill="none"
              stroke={src.color}
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity={0.35}
            />
            {/* Particles — stop when complete */}
            {active && !isComplete && [0, 0.65, 1.3].map((delay, j) => (
              <circle
                key={j}
                r={j === 0 ? 4 : 3}
                fill={src.color}
                opacity={j === 0 ? 0.9 : 0.55}
                filter={`url(#glow-${src.id})`}
              >
                <animateMotion dur="2s" begin={`${delay}s`} repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            ))}
          </g>
        );
      })}

      {/* Brain → report */}
      <g style={{ opacity: brainActive ? 1 : 0.1, transition: "opacity 0.6s" }}>
        <path
          id="p-brain-report"
          d={`M ${CLAUDE_CX + 50} ${CLAUDE_CY} L ${REPORT_LEFT} ${CLAUDE_CY}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity={0.3}
        />
        {brainActive && !isComplete && [0, 0.5, 1.0].map((delay, i) => (
          <circle key={i} r={4 - i} fill="#ffffff" opacity={0.7 - i * 0.2}>
            <animateMotion dur="1.4s" begin={`${delay}s`} repeatCount="indefinite">
              <mpath href="#p-brain-report" />
            </animateMotion>
          </circle>
        ))}
        {/* Static dot when complete */}
        {isComplete && (
          <circle cx={REPORT_LEFT} cy={CLAUDE_CY} r="4" fill="#22C55E" opacity={0.7} />
        )}
      </g>

      {/* Grid */}
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
        {lines.slice(-5).map((line, i, arr) => {
          const token   = parseLine(line);
          const isLast  = i === arr.length - 1;
          return (
            <motion.div
              key={line + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isLast ? 1 : 0.35, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
              style={{ color: token.color }}
            >
              <span className="mt-px"><NarrationIcon token={token} /></span>
              <span>{token.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface LiveKitchenProps {
  title:            string;
  selectedSystems?: SystemDef[];
  onDone:           () => void;
}

export default function LiveKitchen({ title, selectedSystems, onDone }: LiveKitchenProps) {
  // Resolve which source nodes to display
  const activeSourceIds = selectedSystems
    ? selectedSystems.map((s) => s.id)
    : Object.keys(SOURCE_DEFS);
  const sources = activeSourceIds.map((id) => SOURCE_DEFS[id]).filter(Boolean);

  const [nodeStatuses,   setNodeStatuses]   = useState<Record<string, NodeStatus>>(() =>
    Object.fromEntries(activeSourceIds.map((id) => [id, "idle" as NodeStatus]))
  );
  const [brainActive,    setBrainActive]    = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [isComplete,     setIsComplete]     = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [narration,      setNarration]      = useState<string[]>([]);
  const [elapsed,        setElapsed]        = useState(0);

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
    const tick  = setInterval(() => setElapsed(Date.now() - start), 100);

    SCRIPT.forEach((ev) => {
      // Skip events for systems not in the selection
      if (ev.nodeId && !activeSourceIds.includes(ev.nodeId)) return;

      const t = setTimeout(() => {
        switch (ev.type) {
          case "activate":     if (ev.nodeId) activate(ev.nodeId); break;
          case "complete":
            if (ev.nodeId) complete(ev.nodeId);
            if (ev.progress != null) setProgress(ev.progress);
            break;
          case "brain-peak":   setBrainActive(true); break;
          case "report-build": setReportProgress(ev.progress ?? 80); break;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <div className="overflow-x-auto w-full">
    <div
      className="flex flex-col overflow-hidden select-none"
      style={{ background: "#07080D", border: "1px solid #1a1b23", minHeight: 520, minWidth: 720, maxWidth: 1400 }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3 flex-shrink-0"
        style={{ background: "#05060A", borderBottom: "1px solid #151619" }}
      >
        <div className="flex items-center gap-3">
          <motion.span
            className="w-2.5 h-2.5 rounded-full inline-block"
            animate={!isComplete ? { backgroundColor: ["#ef4444", "#ef4444"] } : { backgroundColor: "#22C55E" }}
            style={{ background: isComplete ? "#22C55E" : "#ef4444" }}
          >
            {!isComplete && (
              <motion.span
                className="block w-full h-full rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                style={{ background: "#ef4444" }}
              />
            )}
          </motion.span>

          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
            {isComplete ? "Complete" : "Live"}
          </span>
          <span className="font-mono text-[11px] text-white/60 truncate max-w-xs">{title}</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="font-mono text-[11px] text-white/25">{elapsedSec}s</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-1 overflow-hidden" style={{ background: "#1a1a1a" }}>
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg, #C8341A, #F0A500, #22C55E)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="font-mono text-[10px] text-white/30 w-8">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1" style={{ minHeight: 360 }}>
        <FlowPaths
          sources={sources}
          nodeStatuses={nodeStatuses}
          brainActive={brainActive}
          reportBuilding={reportProgress > 0}
          isComplete={isComplete}
        />

        {/* Source nodes */}
        <div
          className="absolute flex flex-col justify-around"
          style={{ left: 24, top: 40, bottom: 40, width: 224 }}
        >
          {sources.map((src, i) => (
            <SourceCard
              key={src.id}
              node={src}
              status={nodeStatuses[src.id] ?? "idle"}
              index={i}
              isComplete={isComplete}
            />
          ))}
        </div>

        {/* Claude brain */}
        <div
          className="absolute"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <ClaudeBrain
            isPeaking={brainActive}
            isActive={Object.values(nodeStatuses).some((s) => s !== "idle")}
            isComplete={isComplete}
          />
        </div>

        {/* Report preview */}
        <div
          className="absolute"
          style={{ right: 24, top: "50%", transform: "translateY(-50%)" }}
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
            style={{
              left:      [28, "50%", "auto"][i] as string | number,
              right:     i === 2 ? 28 : "auto",
              transform: i === 1 ? "translateX(-50%)" : "none",
            }}
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
            className="px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.06)", borderTop: "1px solid rgba(34,197,94,0.2)" }}
          >
            <p className="font-mono text-[11px] text-green-400/70">
              Report ready — click the preview or open below
            </p>
            <button
              onClick={onDone}
              className="font-mono text-[11px] tracking-widest uppercase px-6 py-2.5 transition-all font-bold"
              style={{ background: "#22C55E", color: "#050609" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#16a34a")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#22C55E")}
            >
              Open Report
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
