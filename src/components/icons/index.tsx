/**
 * All SVG icons used across the UI.
 * Every icon accepts `size` (default 16) and any standard SVG prop.
 * Uses `currentColor` so icons inherit the surrounding text color.
 */

import type { SVGProps, ReactElement } from "react";

/** Shared type for all icon components */
export type IconComponent = (props: SVGProps<SVGSVGElement> & { size?: number }) => ReactElement;

type P = SVGProps<SVGSVGElement> & { size?: number };

/** Shared base attributes for every icon */
function b(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export function IconHome({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M1.5 7.5L8 2.5L14.5 7.5V14H10V9.5H6V14H1.5V7.5Z" />
    </svg>
  );
}

export function IconCheckSquare({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 8l2 2.5L11 5" />
    </svg>
  );
}

export function IconSearch({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

export function IconGear({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
    </svg>
  );
}

// ─── Admin navigation ─────────────────────────────────────────────────────────

export function IconBarChart({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="1.5" y="8"   width="3" height="6.5" rx="0.5" />
      <rect x="6.5" y="4.5" width="3" height="10"  rx="0.5" />
      <rect x="11.5" y="1.5" width="3" height="13"  rx="0.5" />
    </svg>
  );
}

export function IconPlug({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M6 7.5h4V13a2 2 0 0 1-4 0V7.5z" />
      <path d="M5.5 2v5M10.5 2v5" />
      <path d="M4.5 7h7" />
    </svg>
  );
}

export function IconWrench({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M12.5 1.5a3 3 0 0 1 .5 4.5L6 13a2 2 0 1 1-3-3L10 3a3 3 0 0 1 2.5-1.5z" />
    </svg>
  );
}

export function IconShoppingBag({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M3 5h10l-1 9.5H4L3 5z" />
      <path d="M5.5 5V4a2.5 2.5 0 0 1 5 0v1" />
    </svg>
  );
}

export function IconUsers({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1 14c0-3 2.2-4.5 5-4.5s5 1.5 5 4.5" />
      <path d="M11.5 3.5a2.5 2.5 0 0 1 0 5" />
      <path d="M13 9.5c2 .5 3 2 3 4.5" />
    </svg>
  );
}

export function IconPaintbrush({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M12 2l2 2-8.5 8.5H3.5v-2L12 2z" />
      <path d="M10 4l2 2" />
      <path d="M3.5 12.5c0 1.5-1 2.5-2 3 .5-1.5.5-3 0-3h2z" />
    </svg>
  );
}

export function IconLock({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="3" y="7.5" width="10" height="7" rx="1.5" />
      <path d="M5 7.5V5.5a3 3 0 0 1 6 0V7.5" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrendingUp({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M1 12L5.5 7l3 3L14 4" />
      <path d="M10.5 4H14v3.5" />
    </svg>
  );
}

export function IconShield({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 1L2 3.5V8c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V3.5L8 1z" />
      <path d="M5.5 8l2 2L11 6" />
    </svg>
  );
}

export function IconBookOpen({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 3.5C7 2.5 5 2 2 2v11c3 0 5 .5 6 1.5V3.5z" />
      <path d="M8 3.5C9 2.5 11 2 14 2v11c-3 0-5 .5-6 1.5V3.5z" />
    </svg>
  );
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export function IconSun({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
    </svg>
  );
}

export function IconMoon({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M13.5 10A6.5 6.5 0 0 1 6 2.5 6.5 6.5 0 1 0 13.5 10z" />
    </svg>
  );
}

export function IconMonitor({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" />
      <path d="M5.5 14.5h5M8 11v3.5" />
    </svg>
  );
}

// ─── Settings tabs ────────────────────────────────────────────────────────────

/** Sliders — Appearance tab */
export function IconSliders({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5"  cy="4"  r="1.5" />
      <circle cx="10" cy="8"  r="1.5" />
      <circle cx="6"  cy="12" r="1.5" />
    </svg>
  );
}

/** Four-pointed star — AI tab */
export function IconSparkle({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path
        d="M8 1L9.7 6.3L15 8L9.7 9.7L8 15L6.3 9.7L1 8L6.3 6.3L8 1Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Pencil — Labels tab */
export function IconPencil({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M11.5 2L14 4.5l-9 9H2.5v-2.5l9-9z" />
      <path d="M9.5 4l2.5 2.5" />
    </svg>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Info circle — tips/notes */
export function IconInfo({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.5v4" />
      <circle cx="8" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** X / close */
export function IconX({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** Arrow right */
export function IconArrowRight({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
