/**
 * /api/admin/access-rules
 *
 * Manages per-role AI data-access rules for each connector type.
 * Tenant is resolved from the Host header (same pattern as all admin routes).
 *
 * GET  → list all rules for this tenant
 *        Returns one row per (connector_type × role) that has been configured.
 *        Missing rows → caller falls back to system defaults (Admin=all, Manager=team, Member=own).
 *
 * POST → upsert a rule   { connector_type, role, ai_enabled, data_scope }
 *        data_scope: "all" | "team" | "own" | "none"
 *
 * SQL (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS connector_access_rules (
 *     id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     tenant_slug    text NOT NULL,
 *     connector_type text NOT NULL,
 *     role           text NOT NULL,
 *     ai_enabled     boolean NOT NULL DEFAULT true,
 *     data_scope     text    NOT NULL DEFAULT 'own',
 *     updated_at     timestamptz NOT NULL DEFAULT now(),
 *     UNIQUE (tenant_slug, connector_type, role)
 *   );
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

// ── Valid values ───────────────────────────────────────────────────────────────

const VALID_CONNECTORS = ["salesforce", "sap_sales_cloud", "sap_s4hana"] as const;
const VALID_ROLES       = ["Admin", "Manager", "Member"] as const;
const VALID_SCOPES      = ["all", "team", "own", "none"] as const;

// ── Tenant helper ─────────────────────────────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── GET — list rules ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  const { data, error } = await supabaseAdmin
    .from("connector_access_rules")
    .select("id, connector_type, role, ai_enabled, data_scope, updated_at")
    .eq("tenant_slug", tenantSlug)
    .order("connector_type")
    .order("role");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

// ── POST — upsert a rule ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  let body: {
    connector_type?: string;
    role?: string;
    ai_enabled?: boolean;
    data_scope?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { connector_type, role, ai_enabled, data_scope } = body;

  if (!connector_type || !VALID_CONNECTORS.includes(connector_type as typeof VALID_CONNECTORS[number])) {
    return NextResponse.json({ error: `connector_type must be one of: ${VALID_CONNECTORS.join(", ")}` }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }
  if (data_scope && !VALID_SCOPES.includes(data_scope as typeof VALID_SCOPES[number])) {
    return NextResponse.json({ error: `data_scope must be one of: ${VALID_SCOPES.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("connector_access_rules")
    .upsert(
      {
        tenant_slug: tenantSlug,
        connector_type,
        role,
        ai_enabled:  ai_enabled  ?? true,
        data_scope:  data_scope  ?? "own",
        updated_at:  new Date().toISOString(),
      },
      { onConflict: "tenant_slug,connector_type,role" }
    )
    .select("id, connector_type, role, ai_enabled, data_scope, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
