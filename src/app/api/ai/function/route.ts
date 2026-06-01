/**
 * /api/ai/function — AI Functions runner
 *
 * Executes a named AI Function (from the registry) against the user's
 * connected context. The client gathers Graph/Teams/IMAP context and sends
 * it alongside the functionId and AI provider config.
 *
 * POST {
 *   functionId: string
 *   provider: AIProviderId
 *   model: string
 *   context?: string          — connector context assembled client-side
 *   azureEndpoint?: string
 *   azureDeployment?: string
 *   customBaseUrl?: string
 * }
 *
 * Returns { reply, functionId, functionName }
 *
 * Security: same guards as /api/ai/chat.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  readApiKey,
  isValidProvider,
  isSafeUrl,
} from "@/lib/api-security";
import { getAIFunction } from "@/lib/ai-functions/registry";

const MAX_CONTEXT_LENGTH = 16000;
const MAX_TOKENS = 2048;

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
    functionId,
    provider,
    model,
    context,
    azureEndpoint,
    azureDeployment,
    customBaseUrl,
  } = body;

  // ── Validate ────────────────────────────────────────────────────────────────
  if (typeof functionId !== "string" || functionId.length === 0) {
    return NextResponse.json({ error: "functionId is required" }, { status: 400 });
  }
  const fn = getAIFunction(functionId);
  if (!fn) {
    return NextResponse.json({ error: "Unknown functionId" }, { status: 400 });
  }

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (typeof model !== "string" || model.length > 64 || !/^[\w.-]+$/.test(model)) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }
  if (
    context !== undefined &&
    (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)
  ) {
    return NextResponse.json({ error: "context too long" }, { status: 400 });
  }

  if (provider === "azure-openai") {
    if (!azureEndpoint || !isSafeUrl(azureEndpoint)) {
      return NextResponse.json({ error: "Invalid Azure endpoint URL" }, { status: 400 });
    }
  }
  if (provider === "custom") {
    if (!customBaseUrl || !isSafeUrl(customBaseUrl)) {
      return NextResponse.json({ error: "Invalid custom base URL" }, { status: 400 });
    }
  }

  // ── Read API key ────────────────────────────────────────────────────────────
  const apiKey = await readApiKey(provider as string);
  const tenantKey = getTenantKey(provider as string);
  const resolvedKey = apiKey ?? tenantKey;
  if (!resolvedKey && provider !== "custom") {
    return NextResponse.json(
      { error: "No API key configured. Add one in Settings → AI." },
      { status: 401 }
    );
  }

  // ── Build the user message (inject context if available) ───────────────────
  const userMessage = context
    ? `Context from connected systems:\n\n${context}\n\n---\n\n${fn.userPrompt}`
    : fn.userPrompt;

  // ── Dispatch ────────────────────────────────────────────────────────────────
  try {
    let reply: string;
    switch (provider) {
      case "anthropic":
        reply = await callAnthropic(resolvedKey!, model as string, fn.systemPrompt, userMessage);
        break;
      case "openai":
        reply = await callOpenAI(resolvedKey!, model as string, fn.systemPrompt, userMessage);
        break;
      case "gemini":
        reply = await callGemini(resolvedKey!, model as string, fn.systemPrompt, userMessage);
        break;
      case "azure-openai":
        reply = await callAzureOpenAI(
          resolvedKey!,
          azureEndpoint as string,
          azureDeployment as string,
          fn.systemPrompt,
          userMessage
        );
        break;
      case "custom":
        reply = await callCustom(
          resolvedKey ?? "",
          customBaseUrl as string,
          model as string,
          fn.systemPrompt,
          userMessage
        );
        break;
      default:
        return NextResponse.json({ error: "Provider not supported" }, { status: 400 });
    }

    return NextResponse.json({
      reply,
      functionId: fn.id,
      functionName: fn.name,
    });
  } catch (err) {
    console.error("[/api/ai/function] provider error:", err);
    return NextResponse.json(
      { error: "AI provider returned an error. Check your API key and model." },
      { status: 502 }
    );
  }
}

// ─── Provider helpers ─────────────────────────────────────────────────────────

function getTenantKey(provider: string): string | null {
  const map: Record<string, string | undefined> = {
    anthropic:      process.env.ANTHROPIC_API_KEY,
    openai:         process.env.OPENAI_API_KEY,
    gemini:         process.env.GEMINI_API_KEY,
    "azure-openai": process.env.AZURE_OPENAI_API_KEY,
  };
  return map[provider] ?? null;
}

async function callAnthropic(
  key: string,
  model: string,
  system: string,
  userMessage: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenAI(
  key: string,
  model: string,
  system: string,
  userMessage: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  key: string,
  model: string,
  system: string,
  userMessage: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAzureOpenAI(
  key: string,
  endpoint: string,
  deployment: string,
  system: string,
  userMessage: string
): Promise<string> {
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Azure OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callCustom(
  key: string,
  baseUrl: string,
  model: string,
  system: string,
  userMessage: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Custom provider error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
