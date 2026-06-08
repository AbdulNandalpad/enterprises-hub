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
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

// ── Zod schema ────────────────────────────────────────────────────────────────

const ConnectorSchema = z.object({
  connector_type: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "lowercase, digits, underscores only"),
  label:          z.string().min(1).max(128).trim(),
  instance_url:   z.string().url("Must be a valid URL").max(512),
  client_id:      z.string().min(1).max(256).trim(),
  client_secret:  z.string().min(1).max(512),
  extra_config:   z.record(z.string(), z.unknown()).optional(),
});

// ── Tenant helper ─────────────────────────────────────────────────────────────

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
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);
  const type = req.nextUrl.searchParams.get("type");

  let query = supabaseAdmin
    .from("connector_configs")
    .select("id, connector_type, label, instance_url, client_id, is_active, created_at, extra_config")
    .eq("tenant_slug", slug)
    .order("created_at", { ascending: true });

  if (type) query = query.eq("connector_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load connectors" }, { status: 500 });

  // Never return client_secret in list responses
  return NextResponse.json(data ?? []);
}

// ── POST — register a connector ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConnectorSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { connector_type, label, instance_url, client_id, client_secret, extra_config } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("connector_configs")
    .upsert({
      tenant_slug: slug,
      connector_type,
      label,
      instance_url: instance_url.replace(/\/$/, ""),
      client_id,
      client_secret,
      extra_config: extra_config ?? {},
      is_active: true,
    }, { onConflict: "tenant_slug,connector_type,label" })
    .select("id, connector_type, label, instance_url, client_id, is_active, created_at")
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json({ error: "A connector with that type and label already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save connector" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
