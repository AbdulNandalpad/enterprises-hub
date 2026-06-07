"use client";

/**
 * DemoTour — fixed floating card for guided sales demos.
 *
 * Renders only when isActive === true (demo mode + not dismissed).
 * Positioned bottom-right so it never covers main content.
 * Tour state lives in DemoTourContext (sessionStorage-backed).
 */

import { useDemoTour, TOUR_STEPS } from "@/contexts/DemoTourContext";

export function DemoTour() {
  const { step, total, current, isActive, next, prev, dismiss } = useDemoTour();

  if (!isActive) return null;

  const progress = ((step + 1) / total) * 100;

  return (
    <div
      className="fixed bottom-5 right-5 z-[9990] w-[320px] flex flex-col"
      style={{
        background: "#0A0906",
        border:     "1px solid rgba(255,255,255,0.12)",
        boxShadow:  "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Progress bar */}
      <div className="h-[2px] w-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "#C8341A" }}
        />
      </div>

      {/* Body */}
      <div className="px-5 pt-4 pb-3">
        {/* Badge + close row */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5"
            style={{ background: "rgba(200,52,26,0.18)", color: "#C8341A", border: "1px solid rgba(200,52,26,0.30)" }}
          >
            {current.badge}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>
              {step + 1} / {total}
            </span>
            <button
              onClick={dismiss}
              className="transition-opacity hover:opacity-60"
              style={{ color: "rgba(255,255,255,0.30)" }}
              aria-label="Close tour"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1 1l9 9M10 1l-9 9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-[14px] font-semibold leading-snug mb-2" style={{ color: "#F5F1EA" }}>
          {current.title}
        </p>

        {/* Body */}
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {current.body}
        </p>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 pb-3">
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width:      i === step ? 16 : 5,
              height:     5,
              background: i === step ? "#C8341A" : i < step ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={prev}
          disabled={step === 0}
          className="font-mono text-[10px] tracking-widest uppercase transition-opacity hover:opacity-60 disabled:opacity-20"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          ← Back
        </button>

        {current.isFinal ? (
          <a
            href="/#cta"
            onClick={dismiss}
            className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-90"
            style={{ background: "#C8341A", color: "#fff" }}
          >
            Get Access →
          </a>
        ) : (
          <button
            onClick={next}
            className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-90"
            style={{ background: "#F5F1EA", color: "#0A0906" }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
