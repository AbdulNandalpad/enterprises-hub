"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type SidebarMode = "expanded" | "collapsed" | "icons";
export type PanelWidth  = "narrow" | "normal" | "wide";
export type Density     = "compact" | "normal" | "comfortable";

export interface UIPrefs {
  /** Sidebar display mode */
  sidebarMode: SidebarMode;
  /** Right panel visible */
  rightPanelVisible: boolean;
  /** Right panel width */
  rightPanelWidth: PanelWidth;
  /** UI density — affects padding/font-size scale */
  density: Density;
  /**
   * Label overrides — key is the default label text, value is what
   * the user renamed it to.
   * e.g. { "Dashboard": "Home", "My Tasks": "Inbox" }
   */
  labelOverrides: Record<string, string>;
  /**
   * Pinned app IDs — shown at the top of the sidebar apps list.
   */
  pinnedApps: string[];
}

interface UIPrefsContextValue {
  prefs: UIPrefs;
  update: (patch: Partial<UIPrefs>) => void;
  setLabel: (defaultLabel: string, customLabel: string) => void;
  getLabel: (defaultLabel: string) => string;
  reset: () => void;
}

const DEFAULT_PREFS: UIPrefs = {
  sidebarMode: "expanded",
  rightPanelVisible: true,
  rightPanelWidth: "normal",
  density: "normal",
  labelOverrides: {},
  pinnedApps: [],
};

const STORAGE_KEY = "eh-ui-prefs";

function loadPrefs(): UIPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Strip HTML tags and limit to 50 chars — prevents XSS in label overrides */
function sanitiseLabel(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")      // strip any HTML tags
    .replace(/[^\w\s\-_.:/()]/g, "") // allow safe chars only
    .slice(0, 50)
    .trim();
}

const UIPrefsContext = createContext<UIPrefsContextValue>({
  prefs: DEFAULT_PREFS,
  update: () => {},
  setLabel: () => {},
  getLabel: (l) => l,
  reset: () => {},
});

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPrefs>(loadPrefs);

  const update = useCallback((patch: Partial<UIPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setLabel = useCallback(
    (defaultLabel: string, customLabel: string) => {
      setPrefs((prev) => {
        const overrides = { ...prev.labelOverrides };
        const sanitised = sanitiseLabel(customLabel);
        if (sanitised === "" || sanitised === defaultLabel) {
          delete overrides[defaultLabel];
        } else {
          overrides[defaultLabel] = sanitised;
        }
        const next = { ...prev, labelOverrides: overrides };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const getLabel = useCallback(
    (defaultLabel: string): string => {
      return prefs.labelOverrides[defaultLabel] ?? defaultLabel;
    },
    [prefs.labelOverrides]
  );

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPrefs(DEFAULT_PREFS);
  }, []);

  return (
    <UIPrefsContext.Provider value={{ prefs, update, setLabel, getLabel, reset }}>
      {children}
    </UIPrefsContext.Provider>
  );
}

export function useUIPrefs() {
  return useContext(UIPrefsContext);
}
