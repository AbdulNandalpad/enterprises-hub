/**
 * POST /api/ai/superadmin-expert — EnterpriseHub Product Expert AI (superadmin variant)
 *
 * Identical to /api/ai/expert but authenticated via the sa-token HMAC cookie
 * (assertSuperadmin) instead of MSAL assertAdmin. Used when the Playbook AI
 * chat is rendered inside the /superadmin platform panel.
 *
 * Security:
 *   - assertSuperadmin: validates sa-token HMAC cookie, blocks everyone else
 *   - Same-origin CSRF guard
 *   - Rate limit: 30 requests per IP per minute
 *   - API key: env var ANTHROPIC_API_KEY only (no per-tenant key in superadmin context)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  checkRateLimit,
  getClientIp,
} from "@/lib/api-security";
import { assertSuperadmin } from "@/lib/superadmin-auth";
import { buildPlaybookContext } from "@/content/playbook";

export const runtime = "nodejs";

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const playbook = buildPlaybookContext();

  return `You are the EnterpriseHub Product Expert — an AI assistant exclusively for EnterpriseHub staff (sales representatives, technical consultants, and administrators).

Your role is to help EnterpriseHub staff:
- Understand the product architecture deeply
- Prepare for and navigate customer conversations
- Handle technical and sales objections accurately
- Guide customers through setup and integration decisions

You have full knowledge of the EnterpriseHub product, its integration architecture, identity patterns, connector matrix, and sales positioning. Use the playbook below as your authoritative source.

Guidelines:
- Be direct and specific. Staff need actionable answers, not generic advice.
- When answering sales questions, give exact language they can use with customers.
- When answering technical questions, explain at the right depth — not too shallow, not overwhelming.
- If a question is about customer setup, walk through the specific steps.
- If you are not certain about something not covered in the playbook, say so clearly rather than guessing.
- Format responses clearly with **bold** for key terms, bullet points for lists, and code blocks for technical snippets.

---

${playbook}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Superadmin guard — sa-token HMAC cookie ─────────────────────────────────
  const saErr = assertSuperadmin(req);
  if (saErr) return saErr;

  // ── CSRF guard ──────────────────────────────────────────────────────────────
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const ip           = getClientIp(req);
  const rateLimitErr = checkRateLimit(`ai:sa-expert:${ip}`, 30, 60_000);
  if (rateLimitErr) return rateLimitErr;

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message } = body;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  // ── Resolve API key (env only — no tenant context in superadmin) ─────────────
  const apiKey = process.env.ANTHROPIC_API_KEY ?? null;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Anthropic API key configured. " +
          "Add ANTHROPIC_API_KEY to your Vercel environment variables.",
      },
      { status: 401 }
    );
  }

  // ── Call Anthropic ──────────────────────────────────────────────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-opus-4-5",
        max_tokens: 2048,
        system:     buildSystemPrompt(),
        messages:   [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[/api/ai/superadmin-expert] error:", err);
    return NextResponse.json(
      { error: "AI request failed. Check your Anthropic API key." },
      { status: 502 }
    );
  }
}
