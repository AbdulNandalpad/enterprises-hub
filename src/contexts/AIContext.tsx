"use client";

/**
 * AIContext — stores AI configuration client-side.
 *
 * SECURITY NOTE: API keys are NEVER stored here or in localStorage.
 * Keys are saved to an httpOnly cookie via POST /api/user/keys.
 * This context only tracks non-sensitive config (provider choice,
 * model, panel label, etc.) and whether a key has been saved.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  type AIProviderId,
  DEFAULT_AI_PROVIDER,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PANEL_LABEL,
} from "@/lib/ai-providers";

export type AIPanelPosition = "right" | "floating" | "bottom";

export interface AIConfig {
  provider: AIProviderId;
  model: string;
  /** Azure OpenAI only — resource endpoint */
  azureEndpoint: string;
  /** Azure OpenAI only — deployment name */
  azureDeployment: string;
  /** Custom/self-hosted — OpenAI-compatible base URL */
  customBaseUrl: string;
  /** Additional instructions appended to the system prompt */
  systemPromptAddition: string;
  /** What to call the AI panel — user-renameable, max 40 chars */
  panelLabel: string;
  panelPosition: AIPanelPosition;
  enabled: boolean;
}

interface AIContextValue {
  config: AIConfig;
  /** True if a key has been saved server-side for the current provider */
  keyConfigured: boolean;
  /** Runtime open/closed state of the docked panel — not persisted */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  update: (patch: Partial<AIConfig>) => void;
  /** Call after successfully saving a key via /api/user/keys */
  markKeyConfigured: (configured: boolean) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: DEFAULT_AI_PROVIDER,
  model: DEFAULT_AI_MODEL,
  azureEndpoint: "",
  azureDeployment: "",
  customBaseUrl: "",
  systemPromptAddition: "",
  panelLabel: DEFAULT_AI_PANEL_LABEL,
  panelPosition: "right",
  enabled: true,
};

/** Keys safe to persist in localStorage — NO credentials */
const SAFE_KEYS: (keyof AIConfig)[] = [
  "provider",
  "model",
  "azureEndpoint",   // endpoint URL is not a secret
  "azureDeployment", // deployment name is not a secret
  "customBaseUrl",   // base URL is not a secret
  "systemPromptAddition",
  "panelLabel",
  "panelPosition",
  "enabled",
];

const STORAGE_KEY = "eh-ai-config";
const KEY_STATUS_STORAGE = "eh-ai-key-status"; // { [provider]: boolean }

function loadConfig(): AIConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // Only restore safe keys
    const safe: Partial<AIConfig> = {};
    for (const k of SAFE_KEYS) {
      if (k in parsed) (safe as Record<string, unknown>)[k] = parsed[k];
    }
    return { ...DEFAULT_CONFIG, ...safe };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function loadKeyStatus(provider: AIProviderId): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEY_STATUS_STORAGE);
    if (!raw) return false;
    return JSON.parse(raw)[provider] === true;
  } catch {
    return false;
  }
}

function saveKeyStatus(provider: AIProviderId, configured: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY_STATUS_STORAGE);
    const map = raw ? JSON.parse(raw) : {};
    map[provider] = configured;
    localStorage.setItem(KEY_STATUS_STORAGE, JSON.stringify(map));
  } catch {
    // ignore
  }
}

const AIContext = createContext<AIContextValue>({
  config: DEFAULT_CONFIG,
  keyConfigured: false,
  panelOpen: true,
  setPanelOpen: () => {},
  update: () => {},
  markKeyConfigured: () => {},
  reset: () => {},
});

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [keyConfigured, setKeyConfigured] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(true);

  // Load key status for current provider on mount / provider change
  useEffect(() => {
    setKeyConfigured(loadKeyStatus(config.provider));
  }, [config.provider]);

  const update = useCallback((patch: Partial<AIConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      // Only persist safe keys
      const safe: Partial<AIConfig> = {};
      for (const k of SAFE_KEYS) {
        (safe as Record<string, unknown>)[k] = (next as Record<string, unknown>)[k];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
      return next;
    });
  }, []);

  const markKeyConfigured = useCallback(
    (configured: boolean) => {
      setKeyConfigured(configured);
      saveKeyStatus(config.provider, configured);
    },
    [config.provider]
  );

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(KEY_STATUS_STORAGE);
    setConfig(DEFAULT_CONFIG);
    setKeyConfigured(false);
  }, []);

  return (
    <AIContext.Provider value={{ config, keyConfigured, panelOpen, setPanelOpen, update, markKeyConfigured, reset }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  return useContext(AIContext);
}
