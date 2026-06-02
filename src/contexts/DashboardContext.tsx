"use client";

/**
 * DashboardContext — manages the user's custom widget layout.
 *
 * Persistence: localStorage only (key "eh-dashboard").
 * No business data is stored — only widget type, order, span, and
 * per-widget preferences (e.g. the text content of a note widget).
 *
 * Business data (calendar events, profile) is always fetched live
 * from Microsoft Graph on page load. Nothing is cached server-side.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type WidgetType = "calendar" | "profile" | "note" | "apps" | "briefing" | "teams" | "mail" | "salesforce" | "sap";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  /** 1 = half row, 2 = full row */
  span: 1 | 2;
  /** Custom title override — null means use the default */
  title: string | null;
  /** Note widget: persisted text (a preference, not business data) */
  noteContent?: string;
}

interface DashboardContextValue {
  widgets: WidgetConfig[];
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  setSpan: (id: string, span: 1 | 2) => void;
  setTitle: (id: string, title: string) => void;
  updateNote: (id: string, content: string) => void;
}

const STORAGE_KEY = "eh-dashboard";

function load(): WidgetConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WidgetConfig[]) : [];
  } catch {
    return [];
  }
}

function save(widgets: WidgetConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

const DashboardContext = createContext<DashboardContextValue>({
  widgets: [],
  addWidget: () => {},
  removeWidget: () => {},
  moveUp: () => {},
  moveDown: () => {},
  setSpan: () => {},
  setTitle: () => {},
  updateNote: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(load);

  const set = useCallback((next: WidgetConfig[] | ((p: WidgetConfig[]) => WidgetConfig[])) => {
    setWidgets((prev) => {
      const updated = typeof next === "function" ? next(prev) : next;
      save(updated);
      return updated;
    });
  }, []);

  const addWidget = useCallback((type: WidgetType) => {
    const id = Math.random().toString(36).slice(2, 10);
    set((prev) => [...prev, { id, type, span: 1, title: null }]);
  }, [set]);

  const removeWidget = useCallback((id: string) => {
    set((prev) => prev.filter((w) => w.id !== id));
  }, [set]);

  const moveUp = useCallback((id: string) => {
    set((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, [set]);

  const moveDown = useCallback((id: string) => {
    set((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [set]);

  const setSpan = useCallback((id: string, span: 1 | 2) => {
    set((prev) => prev.map((w) => (w.id === id ? { ...w, span } : w)));
  }, [set]);

  const setTitle = useCallback((id: string, title: string) => {
    set((prev) => prev.map((w) => (w.id === id ? { ...w, title: title.trim() || null } : w)));
  }, [set]);

  const updateNote = useCallback((id: string, content: string) => {
    set((prev) => prev.map((w) => (w.id === id ? { ...w, noteContent: content } : w)));
  }, [set]);

  return (
    <DashboardContext.Provider
      value={{ widgets, addWidget, removeWidget, moveUp, moveDown, setSpan, setTitle, updateNote }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
