"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
  /** Which LLM provider to use */
  provider: AIProviderId;
  /** Model id within that provider */
  model: string;
  /**
   * User-level API key (optional — if the tenant admin has set a shared
   * key in Supabase/env vars, this can be left empty).
   */
  apiKey: string;
  /**
   * For Azure OpenAI only: the resource endpoint and deployment name.
   */
  azureEndpoint: string;
  azureDeployment: string;
  /**
   * For custom/self-hosted: the base URL of the OpenAI-compatible API.
   */
  customBaseUrl: string;
  /** Additional instructions appended to the system prompt */
  systemPromptAddition: string;
  /** What to call the AI panel — user can rename it */
  panelLabel: string;
  /** Where the AI panel lives in the layout */
  panelPosition: AIPanelPosition;
  /** Whether the AI panel is enabled at all */
  enabled: boolean;
}

interface AIContextValue {
  config: AIConfig;
  update: (patch: Partial<AIConfig>) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: DEFAULT_AI_PROVIDER,
  model: DEFAULT_AI_MODEL,
  apiKey: "",
  azureEndpoint: "",
  azureDeployment: "",
  customBaseUrl: "",
  systemPromptAddition: "",
  panelLabel: DEFAULT_AI_PANEL_LABEL,
  panelPosition: "right",
  enabled: true,
};

const STORAGE_KEY = "eh-ai-config";

function loadConfig(): AIConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const AIContext = createContext<AIContextValue>({
  config: DEFAULT_CONFIG,
  update: () => {},
  reset: () => {},
});

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(loadConfig);

  const update = useCallback((patch: Partial<AIConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <AIContext.Provider value={{ config, update, reset }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  return useContext(AIContext);
}
