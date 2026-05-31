/**
 * AI provider definitions for EnterpriseHub.
 *
 * Each provider declares the models it supports and how to call them.
 * The actual API call is made server-side via /api/ai/chat — the frontend
 * only stores the provider/model selection and a user-supplied API key
 * (optional if the tenant admin has set a shared key in Supabase).
 */

export type AIProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure-openai"
  | "custom";

export interface AIModel {
  id: string;
  label: string;
  contextWindow: number; // tokens
  supportsTools: boolean;
  description: string;
}

export interface AIProvider {
  id: AIProviderId;
  label: string;
  description: string;
  docsUrl: string;
  requiresApiKey: boolean;
  keyPlaceholder: string;
  keyHelpText: string;
  models: AIModel[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    description: "Best for reasoning over complex business data and long documents.",
    docsUrl: "https://console.anthropic.com",
    requiresApiKey: true,
    keyPlaceholder: "sk-ant-api03-...",
    keyHelpText: "Get your API key from console.anthropic.com",
    models: [
      {
        id: "claude-opus-4-5",
        label: "Claude Opus 4.5",
        contextWindow: 200000,
        supportsTools: true,
        description: "Most intelligent — best for complex cross-system analysis",
      },
      {
        id: "claude-sonnet-4-5",
        label: "Claude Sonnet 4.5",
        contextWindow: 200000,
        supportsTools: true,
        description: "Balanced speed and intelligence — recommended for daily use",
      },
      {
        id: "claude-haiku-3-5",
        label: "Claude Haiku 3.5",
        contextWindow: 200000,
        supportsTools: true,
        description: "Fastest and most cost-efficient",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o and o-series models. Wide tool support.",
    docsUrl: "https://platform.openai.com",
    requiresApiKey: true,
    keyPlaceholder: "sk-...",
    keyHelpText: "Get your API key from platform.openai.com",
    models: [
      {
        id: "gpt-4o",
        label: "GPT-4o",
        contextWindow: 128000,
        supportsTools: true,
        description: "Flagship model — fast, multimodal, strong reasoning",
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o Mini",
        contextWindow: 128000,
        supportsTools: true,
        description: "Cost-efficient for routine queries",
      },
      {
        id: "o1",
        label: "o1",
        contextWindow: 200000,
        supportsTools: false,
        description: "Deep reasoning — slower but thorough",
      },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    description: "Gemini 1.5 and 2.0 with very large context windows.",
    docsUrl: "https://aistudio.google.com",
    requiresApiKey: true,
    keyPlaceholder: "AIza...",
    keyHelpText: "Get your API key from aistudio.google.com",
    models: [
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        contextWindow: 1000000,
        supportsTools: true,
        description: "1M token context — ideal for large document analysis",
      },
      {
        id: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro",
        contextWindow: 2000000,
        supportsTools: true,
        description: "2M token context — most capable Gemini model",
      },
    ],
  },
  {
    id: "azure-openai",
    label: "Azure OpenAI",
    description: "GPT-4 hosted in your Azure tenant — data never leaves your cloud.",
    docsUrl: "https://portal.azure.com",
    requiresApiKey: true,
    keyPlaceholder: "Azure OpenAI API key",
    keyHelpText:
      "Requires: API key, endpoint URL and deployment name from Azure portal",
    models: [
      {
        id: "gpt-4o",
        label: "GPT-4o (Azure)",
        contextWindow: 128000,
        supportsTools: true,
        description: "Same as OpenAI GPT-4o, hosted in your Azure region",
      },
      {
        id: "gpt-4",
        label: "GPT-4 (Azure)",
        contextWindow: 32000,
        supportsTools: true,
        description: "Stable GPT-4 hosted in Azure",
      },
    ],
  },
  {
    id: "custom",
    label: "Custom / Self-hosted",
    description:
      "Any OpenAI-compatible endpoint (Ollama, Mistral, LM Studio, etc.).",
    docsUrl: "",
    requiresApiKey: false,
    keyPlaceholder: "Optional API key",
    keyHelpText: "Provide any OpenAI-compatible base URL",
    models: [
      {
        id: "custom",
        label: "Custom model",
        contextWindow: 0,
        supportsTools: false,
        description: "Model name configured via endpoint URL",
      },
    ],
  },
];

/** Look up a provider by id */
export function getProvider(id: AIProviderId): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

/** Default provider and model used on first load */
export const DEFAULT_AI_PROVIDER: AIProviderId = "anthropic";
export const DEFAULT_AI_MODEL = "claude-sonnet-4-5";
export const DEFAULT_AI_PANEL_LABEL = "AI Assistant";
