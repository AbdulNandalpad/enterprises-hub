/**
 * Tenant Provisioning Service — fully automated, never manual (architecture
 * rule). Creates the tenant's isolated schema from the template, generates
 * its wrapped data key, and registers it in the control plane.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { controlPlane, recordPlatformEvent } from "@/data/control-plane";
import { generateWrappedDataKey } from "@/secrets/envelope";
import type { Tenant } from "@/core/types";

function tenantTemplate(schema: string): string {
  const raw = readFileSync(
    join(process.cwd(), "src/data/migrations/tenant_template.sql"),
    "utf8",
  );
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(schema)) throw new Error("Invalid schema name");
  return raw.replaceAll("{{schema}}", schema);
}

export interface ProvisionInput {
  slug: string;
  name: string;
  ssoOrgId: string;
  region: string;
}

export async function provisionTenant(input: ProvisionInput): Promise<Tenant> {
  const sql = controlPlane();
  const schemaName = `eh_t_${input.slug}`;
  const wrappedKey = generateWrappedDataKey();

  const inserted = await sql`
    insert into control_plane.tenants (slug, name, sso_org_id, region, schema_name, wrapped_data_key)
    values (${input.slug}, ${input.name}, ${input.ssoOrgId}, ${input.region},
            ${schemaName}, ${sql.json(JSON.parse(JSON.stringify(wrappedKey)))})
    returning id, created_at`;
  const row = inserted[0];
  if (!row) throw new Error("Tenant insert returned no row");

  await sql.unsafe(`create schema if not exists ${schemaName}`);
  await sql.unsafe(tenantTemplate(schemaName));
  await sql`
    update control_plane.tenants set status = 'active' where slug = ${input.slug}`;
  await recordPlatformEvent("info", `Tenant ${input.name} provisioned (${input.region})`);

  return {
    id: String(row.id),
    slug: input.slug,
    name: input.name,
    ssoOrgId: input.ssoOrgId,
    region: input.region,
    status: "active",
    schemaName,
    createdAt: new Date(String(row.created_at)),
  };
}
