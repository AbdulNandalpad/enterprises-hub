/**
 * Tenant DB helpers — all reads/writes go through here.
 *
 * Maps Supabase snake_case columns ↔ TypeScript camelCase.
 *
 * Runtime: Node.js only (uses supabaseAdmin service role).
 * Edge Middleware uses the raw REST fetch in middleware.ts instead.
 */

import { supabaseAdmin } from "@/lib/supabase/server";
import type { TenantConfig } from "./types";

// ── Row shape coming back from Supabase ───────────────────────────────────────

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  brand_name: string;
  primary_color: string;
  accent_color: string | null;
  domain: string;
  azure_tenant_id: string | null;
  plan: string;
  active: boolean;
  created_at: string;
  notes: string | null;
}

function rowToConfig(row: TenantRow): TenantConfig {
  return {
    slug:          row.slug,
    name:          row.name,
    brandName:     row.brand_name,
    primaryColor:  row.primary_color,
    accentColor:   row.accent_color   ?? undefined,
    domain:        row.domain,
    azureTenantId: row.azure_tenant_id ?? undefined,
    plan:          row.plan as TenantConfig["plan"],
    active:        row.active,
    createdAt:     row.created_at.split("T")[0],
    notes:         row.notes          ?? undefined,
  };
}

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function getTenantBySlugFromDB(slug: string): Promise<TenantConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return rowToConfig(data as TenantRow);
}

export async function getTenantByDomainFromDB(domain: string): Promise<TenantConfig | null> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("domain", domain)
    .single();
  if (error || !data) return null;
  return rowToConfig(data as TenantRow);
}

export async function getAllTenantsFromDB(): Promise<TenantConfig[]> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as TenantRow[]).map(rowToConfig);
}

// ── Write helpers ─────────────────────────────────────────────────────────────

export interface TenantInput {
  slug: string;
  name: string;
  brandName: string;
  primaryColor: string;
  accentColor?: string;
  domain: string;
  azureTenantId?: string;
  plan: TenantConfig["plan"];
  active?: boolean;
  notes?: string;
}

export async function createTenant(input: TenantInput): Promise<TenantConfig> {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      slug:            input.slug,
      name:            input.name,
      brand_name:      input.brandName,
      primary_color:   input.primaryColor,
      accent_color:    input.accentColor  || null,
      domain:          input.domain,
      azure_tenant_id: input.azureTenantId || null,
      plan:            input.plan,
      active:          input.active ?? true,
      notes:           input.notes  || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToConfig(data as TenantRow);
}

export async function updateTenant(slug: string, patch: Partial<TenantInput> & { active?: boolean }): Promise<TenantConfig> {
  const update: Record<string, unknown> = {};
  if (patch.name          !== undefined) update.name            = patch.name;
  if (patch.brandName     !== undefined) update.brand_name      = patch.brandName;
  if (patch.primaryColor  !== undefined) update.primary_color   = patch.primaryColor;
  if (patch.accentColor   !== undefined) update.accent_color    = patch.accentColor || null;
  if (patch.domain        !== undefined) update.domain          = patch.domain;
  if (patch.azureTenantId !== undefined) update.azure_tenant_id = patch.azureTenantId || null;
  if (patch.plan          !== undefined) update.plan            = patch.plan;
  if (patch.active        !== undefined) update.active          = patch.active;
  if (patch.notes         !== undefined) update.notes           = patch.notes || null;

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(update)
    .eq("slug", slug)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToConfig(data as TenantRow);
}

export async function deleteTenant(slug: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tenants")
    .delete()
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}
