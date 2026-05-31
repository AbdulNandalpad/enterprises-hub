"use client";

/**
 * NoteWidget — a quick scratchpad for the user.
 *
 * The text is stored in localStorage as part of the widget config
 * (it is a UI preference, not business data — no server sync).
 * The note persists across page refreshes on this device/browser.
 */

import { useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";

interface Props {
  widgetId: string;
  initialContent?: string;
}

export function NoteWidget({ widgetId, initialContent = "" }: Props) {
  const { updateNote } = useDashboard();
  const [text, setText] = useState(initialContent);

  // Debounced save — wait 600ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => updateNote(widgetId, text), 600);
    return () => clearTimeout(t);
  }, [text, widgetId, updateNote]);

  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Type a note… it saves automatically to this browser."
      className="w-full h-full min-h-[140px] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-transparent resize-none focus:outline-none leading-relaxed"
    />
  );
}
