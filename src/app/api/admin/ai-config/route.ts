/**
 * /api/admin/ai-config
 *
 * Workspace-level AI provider key management.
 * Admin sets a key once → all users in the tenant can use AI from any machine.
 *
 * GET    ?provider=anthropic   → { configured: boolean }  — never returns the key
 * POST   { provider, key }     → save workspace key to tenants.ai_keys
 * DELETE { provider }          → remove workspace key
 *
 * SQL (run once):
 *   ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_keys jsonb DEFAULT '{}';
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { isValidProvider, isPlausibleApiKey } from "@/lib/api-security";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── GET — check if a workspace key is configured ──────────────────────────────

export async function GET(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const provider = req.nextUrl.searchParams.get("provider");
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const tenantSlug = await getTenantSlug(req);

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("ai_keys")
    .eq("slug", tenantSlug)
    .maybeSingle();

  const aiKeys = (data?.ai_keys ?? {}) as Record<string, string>;
  const configured = Boolean(aiKeys[provider as string]);

  return NextResponse.json({ configured });
}

// ── POST — save workspace key ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { provider, key } = body as Record<string, unknown>;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!isPlausibleApiKey(key)) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
  }

  const tenantSlug = await getTenantSlug(req);

  // Read current ai_keys, merge in the new one
  const { data: row } = await supabaseAdmin
    .from("tenants")
    .select("ai_keys")
    .eq("slug", tenantSlug)
    .maybeSingle();

  const current = (row?.ai_keys ?? {}) as Record<string, string>;
  const updated  = { ...current, [provider as string]: key as string };

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ ai_keys: updated })
    .eq("slug", tenantSlug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: true });
}

// ── DELETE — remove workspace key ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { provider } = body as Record<string, unknown>;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const tenantSlug = await getTenantSlug(req);

  const { data: row } = await supabaseAdmin
    .from("tenants")
    .select("ai_keys")
    .eq("slug", tenantSlug)
    .maybeSingle();

  const current = { ...(row?.ai_keys ?? {}) } as Record<string, string>;
  delete current[provider as string];

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ ai_keys: current })
    .eq("slug", tenantSlug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: false });
}
