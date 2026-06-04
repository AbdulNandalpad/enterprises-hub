"use client";

import { useRef } from "react";
import { useBrandColors } from "@/hooks/useBrandColors";

// ─── Inline SVGs ──────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4.5 1v7M1 4.5h7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 1l6 6M7 1L1 7" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Compact inline brand-color palette editor.
 * Colors persist in localStorage via useBrandColors().
 */
export default function BrandColors({ compact = false }: { compact?: boolean }) {
  const { colors, save, reset } = useBrandColors();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateColor = (i: number, val: string) => {
    const next = [...colors];
    next[i] = val;
    save(next);
  };

  const removeColor = (i: number) => {
    if (colors.length <= 2) return;
    save(colors.filter((_, idx) => idx !== i));
  };

  const addColor = () => {
    if (colors.length >= 8) return;
    save([...colors, "#888888"]);
  };

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-3"}>
      {!compact && (
        <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          Brand Palette
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c, i) => (
          <div key={i} className="relative group">
            {/* Swatch */}
            <button
              onClick={() => inputRefs.current[i]?.click()}
              title={c}
              className="block transition-transform hover:scale-110"
              style={{
                width:  compact ? 18 : 24,
                height: compact ? 18 : 24,
                background:   c,
                border:       "2px solid transparent",
                outline:      "1px solid rgba(0,0,0,0.12)",
              }}
            />

            {/* Hidden color picker */}
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="color"
              value={c}
              onChange={(e) => updateColor(i, e.target.value)}
              className="sr-only"
            />

            {/* Remove button on hover */}
            {!compact && (
              <button
                onClick={() => removeColor(i)}
                aria-label="Remove color"
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        ))}

        {/* Add swatch */}
        {!compact && colors.length < 8 && (
          <button
            onClick={addColor}
            aria-label="Add color"
            className="flex items-center justify-center transition-colors"
            style={{
              width:       24,
              height:      24,
              border:      "1.5px dashed var(--shell-border)",
              color:       "var(--text-muted)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--ink)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--shell-border)")}
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {!compact && (
        <button
          onClick={reset}
          className="font-mono text-[10px] tracking-widest uppercase transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        >
          Reset to default
        </button>
      )}
    </div>
  );
}
