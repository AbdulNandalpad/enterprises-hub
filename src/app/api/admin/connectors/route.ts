/**
 * /api/admin/connectors
 *
 * Tenant-scoped connector configuration management.
 * Stores Salesforce orgs, SAP systems, etc. — one row per system per tenant.
 *
 * GET    → list all connector configs for this tenant
 * POST   → register a new connector config
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

// ── GET — list connectors ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const type = req.nextUrl.searchParams.get("type"); // optional filter

  let query = supabaseAdmin
    .from("connector_configs")
    .select("id, connector_type, label, instance_url, client_id, is_active, created_at, extra_config")
    .eq("tenant_slug", slug)
    .order("created_at", { ascending: true });

  if (type) query = query.eq("connector_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Never return client_secret in list responses
  return NextResponse.json(data ?? []);
}

// ── POST — register a connector ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);

  const body = await req.json() as {
    connector_type: string;
    label: string;
    instance_url: string;
    client_id: string;
    client_secret: string;
    extra_config?: Record<string, unknown>;
  };

  const { connector_type, label, instance_url, client_id, client_secret, extra_config } = body;

  if (!connector_type || !label || !instance_url || !client_id || !client_secret) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("connector_configs")
    .upsert({
      tenant_slug: slug,
      connector_type,
      label,
      instance_url: instance_url.replace(/\/$/, ""), // strip trailing slash
      client_id,
      client_secret,
      extra_config: extra_config ?? {},
      is_active: true,
    }, { onConflict: "tenant_slug,connector_type,label" })
    .select("id, connector_type, label, instance_url, client_id, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
