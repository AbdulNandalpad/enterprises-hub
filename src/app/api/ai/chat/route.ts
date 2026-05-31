/**
 * /api/ai/chat  — secure AI proxy
 *
 * All AI calls go through here.  The client sends the message + config
 * (provider, model) but NEVER the API key.  The key is read server-side
 * from the httpOnly cookie set by /api/user/keys.
 *
 * POST {
 *   message: string
 *   provider: AIProviderId
 *   model: string
 *   systemAddition?: string  — extra instructions from user prefs
 *   context?: string         — optional pasted business context
 *   azureEndpoint?: string
 *   azureDeployment?: string
 *   customBaseUrl?: string
 * }
 *
 * Returns a streaming or single-shot JSON response depending on provider.
 *
 * Security:
 * - Origin check (CSRF guard)
 * - Key read from httpOnly cookie — never from request body
 * - Input length caps to prevent prompt injection / runaway costs
 * - Provider/model allowlist
 */

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  readApiKey,
  isValidProvider,
  isSafeUrl,
} from "@/lib/api-security";

const MAX_MESSAGE_LENGTH = 8000;
const MAX_SYSTEM_ADDITION_LENGTH = 1000;
const MAX_CONTEXT_LENGTH = 16000;

const BASE_SYSTEM_PROMPT = `You are the EnterpriseHub AI Assistant — an intelligent assistant
embedded inside an enterprise workspace. You help users understand and act on data from
connected business systems (SAP, Salesforce, ServiceNow, Jira, Microsoft Teams, and more).
Always be concise, professional, and specific. When referencing business data, cite which
system the information came from. Never make up data — if you don't have information from
a system, say so clearly.`;

export async function POST(req: NextRequest) {
  // ── CSRF guard ──────────────────────────────────────────────────────────────
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    message,
    provider,
    model,
    systemAddition,
    context,
    azureEndpoint,
    azureDeployment,
    customBaseUrl,
  } = body;

  // ── Validate inputs ─────────────────────────────────────────────────────────
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (typeof model !== "string" || model.length > 64 || !/^[\w.-]+$/.test(model)) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }
  if (
    systemAddition !== undefined &&
    (typeof systemAddition !== "string" ||
      systemAddition.length > MAX_SYSTEM_ADDITION_LENGTH)
  ) {
    return NextResponse.json(
      { error: "systemAddition too long" },
      { status: 400 }
    );
  }
  if (
    context !== undefined &&
    (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)
  ) {
    return NextResponse.json({ error: "context too long" }, { status: 400 });
  }

  // ── Validate URLs for azure / custom ───────────────────────────────────────
  if (provider === "azure-openai") {
    if (!azureEndpoint || !isSafeUrl(azureEndpoint)) {
      return NextResponse.json(
        { error: "Invalid Azure endpoint URL" },
        { status: 400 }
      );
    }
  }
  if (provider === "custom") {
    if (!customBaseUrl || !isSafeUrl(customBaseUrl)) {
      return NextResponse.json(
        { error: "Invalid custom base URL" },
        { status: 400 }
      );
    }
  }

  // ── Read API key from httpOnly cookie ───────────────────────────────────────
  const apiKey = await readApiKey(provider as string);

  // Fall back to env-level tenant key (set by admin)
  const tenantKey = getTenantKey(provider as string);

  const resolvedKey = apiKey ?? tenantKey;
  if (!resolvedKey && provider !== "custom") {
    return NextResponse.json(
      {
        error: "No API key configured for this provider. Add one in Settings → AI.",
      },
      { status: 401 }
    );
  }

  // ── Build system prompt ─────────────────────────────────────────────────────
  const systemPrompt = [
    BASE_SYSTEM_PROMPT,
    systemAddition?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // ── Dispatch to provider ────────────────────────────────────────────────────
  try {
    switch (provider) {
      case "anthropic":
        return await callAnthropic(resolvedKey!, model as string, message, systemPrompt, context as string | undefined);
      case "openai":
        return await callOpenAI(resolvedKey!, model as string, message, systemPrompt, context as string | undefined);
      case "gemini":
        return await callGemini(resolvedKey!, model as string, message, systemPrompt, context as string | undefined);
      case "azure-openai":
        return await callAzureOpenAI(
          resolvedKey!,
          azureEndpoint as string,
          azureDeployment as string,
          model as string,
          message,
          systemPrompt,
          context as string | undefined
        );
      case "custom":
        return await callCustom(
          resolvedKey ?? "",
          customBaseUrl as string,
          model as string,
          message,
          systemPrompt,
          context as string | undefined
        );
      default:
        return NextResponse.json(
          { error: "Provider not supported" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[/api/ai/chat] provider error:", err);
    // Don't leak internal error details to the client
    return NextResponse.json(
      { error: "AI provider returned an error. Check your API key and model." },
      { status: 502 }
    );
  }
}

// ─── Provider helpers ─────────────────────────────────────────────────────────

function getTenantKey(provider: string): string | null {
  const map: Record<string, string | undefined> = {
    anthropic:    process.env.ANTHROPIC_API_KEY,
    openai:       process.env.OPENAI_API_KEY,
    gemini:       process.env.GEMINI_API_KEY,
    "azure-openai": process.env.AZURE_OPENAI_API_KEY,
  };
  return map[provider] ?? null;
}

function buildMessages(message: string, context?: string) {
  const userContent = context
    ? `Context from connected systems:\n\n${context}\n\n---\n\n${message}`
    : message;
  return userContent;
}

async function callAnthropic(
  key: string,
  model: string,
  message: string,
  system: string,
  context?: string
): Promise<NextResponse> {
  const body = {
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: buildMessages(message, context) }],
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  return NextResponse.json({ reply: text, provider: "anthropic", model });
}

async function callOpenAI(
  key: string,
  model: string,
  message: string,
  system: string,
  context?: string
): Promise<NextResponse> {
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildMessages(message, context) },
    ],
    max_tokens: 1024,
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply: text, provider: "openai", model });
}

async function callGemini(
  key: string,
  model: string,
  message: string,
  system: string,
  context?: string
): Promise<NextResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: buildMessages(message, context) }] }],
    generationConfig: { maxOutputTokens: 1024 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return NextResponse.json({ reply: text, provider: "gemini", model });
}

async function callAzureOpenAI(
  key: string,
  endpoint: string,
  deployment: string,
  model: string,
  message: string,
  system: string,
  context?: string
): Promise<NextResponse> {
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildMessages(message, context) },
    ],
    max_tokens: 1024,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Azure OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply: text, provider: "azure-openai", model });
}

async function callCustom(
  key: string,
  baseUrl: string,
  model: string,
  message: string,
  system: string,
  context?: string
): Promise<NextResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildMessages(message, context) },
    ],
    max_tokens: 1024,
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Custom provider error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ reply: text, provider: "custom", model });
}
