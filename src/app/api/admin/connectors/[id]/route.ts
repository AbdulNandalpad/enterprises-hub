/**
 * /api/admin/connectors/[id]
 *
 * DELETE → remove a connector config by ID (tenant-scoped)
 * PATCH  → update is_active and/or extra_config (e.g. SAML Bearer fields)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

// ── Zod schema ────────────────────────────────────────────────────────────────

const ConnectorPatchSchema = z.object({
  is_active:    z.boolean().optional(),
  extra_config: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (d) => d.is_active !== undefined || d.extra_config !== undefined,
  { message: "Provide at least one of: is_active, extra_config" },
);

// ── Tenant helper ─────────────────────────────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── DELETE — remove connector ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("connector_configs")
    .delete()
    .eq("id", id)
    .eq("tenant_slug", slug); // tenant scope — can't delete another tenant's config

  if (error) return NextResponse.json({ error: "Failed to delete connector" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── PATCH — update connector ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const { id } = await params;

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConnectorPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.is_active    !== undefined) updates.is_active    = parsed.data.is_active;
  if (parsed.data.extra_config !== undefined) updates.extra_config = parsed.data.extra_config;

  const { data, error } = await supabaseAdmin
    .from("connector_configs")
    .update(updates)
    .eq("id", id)
    .eq("tenant_slug", slug)
    .select("id, is_active, extra_config")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update connector" }, { status: 500 });
  return NextResponse.json(data);
}
