"use client";

/**
 * FunctionChips — horizontal row of quick-action AI Function chips.
 *
 * Shown above the chat input in the AI panel.
 * Clicking a chip fires the corresponding AI Function and
 * injects the trigger message + result into the chat.
 */

import { AI_FUNCTIONS } from "@/lib/ai-functions/registry";

interface Props {
  /** Called when the user clicks a chip — passes the functionId */
  onActivate: (functionId: string, label: string) => void;
  /** Disable all chips while a function is running */
  disabled?: boolean;
}

export function FunctionChips({ onActivate, disabled }: Props) {
  return (
    <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide flex-shrink-0">
      {AI_FUNCTIONS.map((fn) => {
        const Icon = fn.Icon;
        return (
          <button
            key={fn.id}
            onClick={() => onActivate(fn.id, fn.name)}
            disabled={disabled}
            title={fn.description}
            className={[
              "flex-shrink-0 flex items-center gap-1.5",
              "px-2.5 py-1 rounded-full",
              "border border-[var(--shell-border)]",
              "bg-[var(--shell-bg)] hover:bg-[var(--active-bg)]",
              "hover:border-[var(--active-text)] hover:text-[var(--active-text)]",
              "text-[var(--text-secondary)] text-[11px] font-medium",
              "transition-colors disabled:opacity-40 disabled:pointer-events-none",
              "whitespace-nowrap",
            ].join(" ")}
          >
            <Icon size={11} />
            {fn.name}
          </button>
        );
      })}
    </div>
  );
}
