/**
 * /api/integrations
 *
 * Unified integration state management — per tenant.
 * Handles enabled/show_in_nav state for ALL integrations.
 * Credential storage for new integration types (MCP, API Key).
 * SAP / Salesforce credentials continue to use /api/admin/connectors.
 *
 * Supabase table (run once in your SQL editor):
 * ──────────────────────────────────────────────────────────────────────────────
 * create table if not exists tenant_integrations (
 *   id             uuid primary key default gen_random_uuid(),
 *   tenant_slug    text not null,
 *   integration_id text not null,
 *   enabled        boolean not null default false,
 *   show_in_nav    boolean not null default false,
 *   nav_label      text,
 *   auth_method    text,
 *   config         jsonb not null default '{}',
 *   instance_url   text,
 *   last_status    text default 'not_configured',
 *   last_tested_at timestamptz,
 *   created_at     timestamptz not null default now(),
 *   updated_at     timestamptz not null default now(),
 *   unique (tenant_slug, integration_id)
 * );
 *
 * -- RLS: only service role can access (all calls go through API routes)
 * alter table tenant_integrations enable row level security;
 *
 * -- Trigger to auto-update updated_at
 * create or replace function set_updated_at()
 * returns trigger language plpgsql as $$
 * begin new.updated_at = now(); return new; end; $$;
 *
 * create trigger tenant_integrations_updated_at
 *   before update on tenant_integrations
 *   for each row execute procedure set_updated_at();
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin }          from "@/lib/api-security";
import { supabaseAdmin }             from "@/lib/supabase/server";
import { getTenantByDomainFromDB }   from "@/lib/tenant/db";
import { getStaticTenantByDomain }   from "@/lib/tenant/registry";
import { INTEGRATIONS }              from "@/lib/integrations/registry";
import type { IntegrationState, IntegrationStatus } from "@/lib/integrations/types";

// ── Tenant resolution (same pattern as /api/admin/connectors) ─────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── DB row shape ──────────────────────────────────────────────────────────────

interface TenantIntegrationRow {
  integration_id:  string;
  enabled:         boolean;
  show_in_nav:     boolean;
  nav_label:       string | null;
  auth_method:     string | null;
  instance_url:    string | null;
  last_status:     string | null;
  last_tested_at:  string | null;
}

// ── GET — list all integration states for this tenant ─────────────────────────

export async function GET(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);

  // 1. Fetch tenant_integrations rows
  const { data: rows, error } = await supabaseAdmin
    .from("tenant_integrations")
    .select("integration_id, enabled, show_in_nav, nav_label, auth_method, instance_url, last_status, last_tested_at")
    .eq("tenant_slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rowMap = new Map<string, TenantIntegrationRow>(
    (rows ?? []).map((r) => [r.integration_id, r as TenantIntegrationRow])
  );

  // 2. Also check legacy connector_configs for SAP/Salesforce status
  const { data: connConfigs } = await supabaseAdmin
    .from("connector_configs")
    .select("connector_type, is_active, instance_url")
    .eq("tenant_slug", slug);

  const legacyMap = new Map<string, { is_active: boolean; instance_url: string }>();
  for (const c of connConfigs ?? []) {
    legacyMap.set(c.connector_type as string, { is_active: c.is_active as boolean, instance_url: c.instance_url as string });
  }

  // 3. Merge registry with tenant state
  const states: IntegrationState[] = INTEGRATIONS.map((def) => {
    const row = rowMap.get(def.id);

    // Determine status
    let status: IntegrationStatus = "not_configured";
    if (def.configType === "always-on") {
      status = "always_on";
    } else if (def.legacyConnectorType) {
      const legacy = legacyMap.get(def.legacyConnectorType);
      if (legacy?.is_active) status = "connected";
    } else if (row?.last_status === "connected") {
      status = "connected";
    } else if (row?.last_status === "error") {
      status = "error";
    }

    return {
      integration_id:  def.id,
      enabled:         row?.enabled         ?? def.configType === "always-on",
      show_in_nav:     row?.show_in_nav     ?? false,
      nav_label:       row?.nav_label       ?? undefined,
      status,
      instance_url:    row?.instance_url    ?? undefined,
      last_tested_at:  row?.last_tested_at  ?? undefined,
    };
  });

  return NextResponse.json(states);
}

// ── PATCH — update integration state ─────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const slug = await getTenantSlug(req);

  const body = await req.json() as {
    integration_id:  string;
    enabled?:        boolean;
    show_in_nav?:    boolean;
    nav_label?:      string;
    auth_method?:    string;
    instance_url?:   string;
    config?:         Record<string, unknown>;
    last_status?:    IntegrationStatus;
    last_tested_at?: string;
  };

  if (!body.integration_id) {
    return NextResponse.json({ error: "integration_id is required" }, { status: 400 });
  }

  // Build the upsert payload — only include defined fields
  const upsert: Record<string, unknown> = {
    tenant_slug:    slug,
    integration_id: body.integration_id,
    updated_at:     new Date().toISOString(),
  };
  if (body.enabled        !== undefined) upsert.enabled        = body.enabled;
  if (body.show_in_nav    !== undefined) upsert.show_in_nav    = body.show_in_nav;
  if (body.nav_label      !== undefined) upsert.nav_label      = body.nav_label || null;
  if (body.auth_method    !== undefined) upsert.auth_method    = body.auth_method;
  if (body.instance_url   !== undefined) upsert.instance_url   = body.instance_url || null;
  if (body.last_status    !== undefined) upsert.last_status    = body.last_status;
  if (body.last_tested_at !== undefined) upsert.last_tested_at = body.last_tested_at;

  // Store non-sensitive config (MCP URLs, API endpoints) in jsonb
  // ⚠️  Do NOT store raw secrets here — route to /api/admin/connectors for
  //     OAuth client secrets, or use Supabase Vault for API keys.
  if (body.config) {
    const safeConfig: Record<string, unknown> = {};
    const ALLOWED_CONFIG_KEYS = ["mcp_url", "instance_url", "auth_method", "region", "workspace"];
    for (const key of ALLOWED_CONFIG_KEYS) {
      if (body.config[key] !== undefined) safeConfig[key] = body.config[key];
    }
    if (Object.keys(safeConfig).length > 0) upsert.config = safeConfig;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_integrations")
    .upsert(upsert, { onConflict: "tenant_slug,integration_id" })
    .select("integration_id, enabled, show_in_nav, nav_label, instance_url, last_status, last_tested_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
