/**
 * /api/admin/connectors/[id]
 *
 * DELETE → remove a connector config by ID (tenant-scoped)
 * PATCH  → update is_active and/or extra_config (e.g. SAML Bearer fields)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("connector_configs")
    .delete()
    .eq("id", id)
    .eq("tenant_slug", slug); // tenant scope — can't delete another tenant's config

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const { id } = await params;
  const body = await req.json() as { is_active?: boolean; extra_config?: Record<string, unknown> };

  // Build only the columns that were sent
  const updates: Record<string, unknown> = {};
  if (body.is_active    !== undefined) updates.is_active    = body.is_active;
  if (body.extra_config !== undefined) updates.extra_config = body.extra_config;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("connector_configs")
    .update(updates)
    .eq("id", id)
    .eq("tenant_slug", slug)
    .select("id, is_active, extra_config")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
