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

// ─── Dashboard widgets ────────────────────────────────────────────────────────

export function IconCalendar({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="2" y="3.5" width="12" height="11" rx="1.5" />
      <path d="M2 7.5h12" />
      <path d="M5.5 2v3M10.5 2v3" />
      <path d="M5 10.5h1M8 10.5h1M11 10.5h1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPerson({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="8" cy="5.5" r="3" />
      <path d="M2 14c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
    </svg>
  );
}

export function IconGrid({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="2"   y="2"   width="5" height="5" rx="1" />
      <rect x="9"   y="2"   width="5" height="5" rx="1" />
      <rect x="2"   y="9"   width="5" height="5" rx="1" />
      <rect x="9"   y="9"   width="5" height="5" rx="1" />
    </svg>
  );
}

export function IconPlus({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

export function IconStickyNote({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M3 2h10v9l-4 3H3V2z" />
      <path d="M9 11v3l4-3" />
      <path d="M5.5 6h5M5.5 8.5h3" />
    </svg>
  );
}

export function IconChevronUp({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M4 10l4-4 4 4" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function IconColumns({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="2"  y="2" width="5" height="12" rx="1" />
      <rect x="9"  y="2" width="5" height="12" rx="1" />
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

/** Lightning bolt — AI function / quick action */
export function IconBolt({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M9 2L4 8h5l-2 6 7-8H9l2-4z" />
    </svg>
  );
}

/** Mail envelope */
export function IconMail({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <rect x="1" y="3" width="14" height="10" rx="1" />
      <path d="M1 4l7 5 7-5" />
    </svg>
  );
}

/** Sun rising — morning / briefing */
export function IconSunrise({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 5V2M3.5 7.5L1.5 5.5M12.5 7.5l2-2M1 12h14M4 12a4 4 0 0 1 8 0" />
    </svg>
  );
}

/** Clock — end of day / time */
export function IconClock({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}

/** Sign out (arrow leaving a box) */
export function IconSignOut({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M6 4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3" />
      <path d="M10 10l3-3-3-3" />
      <path d="M5 7h8" />
    </svg>
  );
}

/** Chevron down (small caret) */
export function IconChevronDownSmall({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M3 5l4 4 4-4" />
    </svg>
  );
}

/** Hamburger menu (three lines) */
export function IconMenu({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

/** Trash / delete */
export function IconTrash({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M3 4h10M5 4V3h6v1M4 4l1 9h6l1-9" />
    </svg>
  );
}

/** Building / company */
export function IconBuilding({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M2 13V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v9M2 13h12M5 7h1M8 7h1M11 7h1M5 10h1M8 10h1M11 10h1M6 13V11h4v2" />
    </svg>
  );
}

/** Key / auth */
export function IconKey({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="5" cy="8" r="3" />
      <path d="M8 8h6M12 8v2M14 8v2" />
    </svg>
  );
}

/** Download arrow */
export function IconDownload({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 2v8M5 7l3 3 3-3M3 12h10" />
    </svg>
  );
}

/** Activity / pulse */
export function IconActivity({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M1 8h3l2-4 3 8 2-4h4" />
    </svg>
  );
}

/** Crown / admin role */
export function IconCrown({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M2 11l2-5 4 3 4-3 2 5H2zM2 11h12" />
    </svg>
  );
}

/** User with checkmark */
export function IconUserCheck({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13c0-3 2-4.5 5-4.5M10 10l1.5 1.5L14 9" />
    </svg>
  );
}

/** Upload arrow */
export function IconUpload({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M8 10V2M5 5l3-3 3 3M3 12h10" />
    </svg>
  );
}

/** Link / chain */
export function IconLink({ size = 16, ...p }: P) {
  return (
    <svg {...b(size)} {...p}>
      <path d="M6 10a3 3 0 0 1 0-4l1-1a3 3 0 0 1 4 4l-.5.5M10 6a3 3 0 0 1 0 4l-1 1a3 3 0 0 1-4-4l.5-.5" />
    </svg>
  );
}
