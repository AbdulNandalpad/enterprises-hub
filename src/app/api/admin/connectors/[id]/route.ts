/**
 * /api/admin/connectors/[id]
 *
 * DELETE → remove a connector config by ID (tenant-scoped)
 * PATCH  → toggle is_active
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
  const body  = await req.json() as { is_active?: boolean };

  const { data, error } = await supabaseAdmin
    .from("connector_configs")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .eq("tenant_slug", slug)
    .select("id, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
