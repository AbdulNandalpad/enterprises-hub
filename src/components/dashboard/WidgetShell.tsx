"use client";

/**
 * WidgetShell — the container every dashboard widget lives inside.
 * Provides: title bar, move up/down, span toggle (1/2 col), remove, title edit.
 */

import { useState } from "react";
import { useDashboard, type WidgetConfig } from "@/contexts/DashboardContext";
import {
  IconChevronUp, IconChevronDown, IconX, IconColumns, IconPencil,
} from "@/components/icons";
import type { ReactNode } from "react";

interface Props {
  widget: WidgetConfig;
  defaultTitle: string;
  icon: ReactNode;
  children: ReactNode;
  isFirst: boolean;
  isLast: boolean;
}

export function WidgetShell({ widget, defaultTitle, icon, children, isFirst, isLast }: Props) {
  const { moveUp, moveDown, removeWidget, setSpan, setTitle } = useDashboard();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(widget.title ?? "");

  function commitTitle() {
    setTitle(widget.id, titleDraft);
    setEditingTitle(false);
  }

  return (
    <div className="flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--shell-border)] bg-[var(--shell-bg)] flex-shrink-0">
        <span className="text-[var(--text-muted)] flex-shrink-0">{icon}</span>

        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(widget.title ?? ""); setEditingTitle(false); }
            }}
            className="flex-1 text-xs font-semibold bg-transparent border-b border-[var(--active-text)] outline-none text-[var(--text-primary)]"
          />
        ) : (
          <span
            className="flex-1 text-xs font-semibold text-[var(--text-primary)] truncate cursor-default"
            onDoubleClick={() => { setTitleDraft(widget.title ?? ""); setEditingTitle(true); }}
            title="Double-click to rename"
          >
            {widget.title || defaultTitle}
          </span>
        )}

        {/* Controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Span toggle */}
          <button
            onClick={() => setSpan(widget.id, widget.span === 1 ? 2 : 1)}
            title={widget.span === 1 ? "Expand to full width" : "Collapse to half width"}
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <IconColumns size={12} />
          </button>
          {/* Rename */}
          <button
            onClick={() => { setTitleDraft(widget.title ?? ""); setEditingTitle(true); }}
            title="Rename widget"
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <IconPencil size={12} />
          </button>
          {/* Move up */}
          <button
            onClick={() => moveUp(widget.id)}
            disabled={isFirst}
            title="Move up"
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition-colors"
          >
            <IconChevronUp size={12} />
          </button>
          {/* Move down */}
          <button
            onClick={() => moveDown(widget.id)}
            disabled={isLast}
            title="Move down"
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] disabled:opacity-30 transition-colors"
          >
            <IconChevronDown size={12} />
          </button>
          {/* Remove */}
          <button
            onClick={() => removeWidget(widget.id)}
            title="Remove widget"
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--red-status)] hover:bg-[var(--red-bg)] transition-colors"
          >
            <IconX size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
