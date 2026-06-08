/**
 * POST /api/ai/expert — EnterpriseHub Product Expert AI
 *
 * An AI endpoint that has the full EnterpriseHub Product Intelligence Playbook
 * injected as its system context. Used exclusively in the Admin → Playbook
 * section by EnterpriseHub staff (sales reps, technical reps, admins).
 *
 * This AI can answer any question about:
 *   - Product architecture and how it works
 *   - Identity patterns (SAML Bearer, per-user OAuth, principal propagation)
 *   - Connector setup and auth matrix
 *   - Sales positioning and objection handling
 *   - Customer discovery and sizing
 *
 * Security:
 *   - assertAdmin: blocks all non-admin sessions (including demo sessions)
 *   - Same-origin CSRF guard
 *   - Rate limit: 30 requests per IP per minute
 *   - API key three-tier: personal cookie → workspace → env
 *   - Only Anthropic provider (best at nuanced product knowledge)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  checkRateLimit,
  getClientIp,
  readApiKey,
} from "@/lib/api-security";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
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

// ─── Tenant slug helper ───────────────────────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fall through */ }
  return getStaticTenantByDomain(host).slug;
}

async function getWorkspaceAnthropicKey(tenantSlug: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("ai_keys")
      .eq("slug", tenantSlug)
      .maybeSingle();
    const aiKeys = (data?.ai_keys ?? {}) as Record<string, string>;
    return aiKeys["anthropic"] ?? null;
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Admin-only guard — blocks demo sessions and non-admin users ─────────────
  const adminErr = await assertAdmin(req);
  if (adminErr) return adminErr;

  // ── CSRF guard ──────────────────────────────────────────────────────────────
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const ip           = getClientIp(req);
  const rateLimitErr = checkRateLimit(`ai:expert:${ip}`, 30, 60_000);
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

  // ── Resolve API key ─────────────────────────────────────────────────────────
  const tenantSlug    = await getTenantSlug(req);
  const personalKey   = await readApiKey("anthropic");
  const workspaceKey  = await getWorkspaceAnthropicKey(tenantSlug);
  const envKey        = process.env.ANTHROPIC_API_KEY ?? null;
  const apiKey        = personalKey ?? workspaceKey ?? envKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Anthropic API key configured. " +
          "Add one in Settings → AI, or ask your workspace admin to set a workspace key.",
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
    console.error("[/api/ai/expert] error:", err);
    return NextResponse.json(
      { error: "AI request failed. Check your Anthropic API key." },
      { status: 502 }
    );
  }
}
