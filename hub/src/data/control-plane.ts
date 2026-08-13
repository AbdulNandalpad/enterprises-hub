/**
 * Control-plane DB access: tenant registry, wrapped tenant keys, platform
 * events. Lives in its own schema (control_plane) in the v2 Supabase
 * instance — separate from every tenant schema.
 */
import postgres from "postgres";
import { requireEnv } from "@/core/env";
import type { Tenant, TenantStatus } from "@/core/types";

let sql: postgres.Sql | null = null;

/** Lazy singleton — never connects at build/import time. */
export function controlPlane(): postgres.Sql {
  if (!sql) {
    sql = postgres(requireEnv("DATABASE_URL"), {
      max: 5,
      prepare: false, // pgbouncer (Supabase pooler) compatibility
    });
  }
  return sql;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  sso_org_id: string;
  region: string;
  status: TenantStatus;
  schema_name: string;
  created_at: Date;
}

function toTenant(r: TenantRow): Tenant {
  return {
    id: r.id, slug: r.slug, name: r.name, ssoOrgId: r.sso_org_id,
    region: r.region, status: r.status, schemaName: r.schema_name,
    createdAt: r.created_at,
  };
}

export async function findTenantBySsoOrg(directoryId: string): Promise<Tenant | null> {
  const rows = await controlPlane()<TenantRow[]>`
    select * from control_plane.tenants where sso_org_id = ${directoryId} limit 1`;
  const row = rows[0];
  return row ? toTenant(row) : null;
}

export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  const rows = await controlPlane()<TenantRow[]>`
    select * from control_plane.tenants where slug = ${slug} limit 1`;
  const row = rows[0];
  return row ? toTenant(row) : null;
}

export async function recordPlatformEvent(
  severity: "info" | "warn",
  message: string,
): Promise<void> {
  await controlPlane()`
    insert into control_plane.platform_events (severity, message)
    values (${severity}, ${message})`;
}
