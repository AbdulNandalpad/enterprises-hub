/**
 * POST /api/admin/users/bulk
 *
 * Accepts an array of users and inserts them with upsert semantics.
 * Existing users (same email in same tenant) are skipped (not overwritten).
 *
 * Body: { users: { name: string; email: string; roles: string[] }[] }
 * Returns: { created: number; skipped: number; errors: string[] }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

const VALID_ROLES = new Set(["Admin", "Manager", "Employee", "Read-only"]);
const MAX_BATCH   = 500;

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

export async function POST(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  let body: { users?: unknown[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!Array.isArray(body.users) || body.users.length === 0) {
    return NextResponse.json({ error: "users array required" }, { status: 400 });
  }
  if (body.users.length > MAX_BATCH) {
    return NextResponse.json({ error: `Max ${MAX_BATCH} users per batch` }, { status: 400 });
  }

  const tenantSlug = await getTenantSlug(req);
  const now = new Date().toISOString();

  const rows: { tenant_slug: string; email: string; name: string; roles: string[]; status: string; invited_at: string }[] = [];
  const parseErrors: string[] = [];

  for (const raw of body.users) {
    const u = raw as Record<string, unknown>;
    const email = (typeof u.email === "string" ? u.email : "").toLowerCase().trim();
    const name  = (typeof u.name  === "string" ? u.name  : "").trim();
    const rawRoles = Array.isArray(u.roles) ? u.roles : [];
    const roles = rawRoles.filter((r): r is string => typeof r === "string" && VALID_ROLES.has(r));

    if (!email.includes("@") || !name) {
      parseErrors.push(`Skipped row — missing or invalid name/email: ${JSON.stringify({ name, email })}`);
      continue;
    }

    rows.push({ tenant_slug: tenantSlug, email, name, roles, status: "pending", invited_at: now });
  }

  if (rows.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0, errors: parseErrors }, { status: 200 });
  }

  // Upsert — on conflict (tenant_slug, email) do nothing (ignore existing users)
  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .upsert(rows, { onConflict: "tenant_slug,email", ignoreDuplicates: true })
    .select("email");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const created = data?.length ?? 0;
  const skipped = rows.length - created;

  return NextResponse.json({ created, skipped, errors: parseErrors }, { status: 201 });
}
