/**
 * /api/admin/users
 *
 * Tenant-scoped user management.
 * Tenant is resolved from the Host header — never from a user-writable cookie.
 *
 * GET    → list users for the current tenant
 * POST   → invite a new user (inserts into tenant_users with status = 'pending')
 * PATCH  → update a user's roles or status
 * DELETE → remove a user (?email=...)
 *
 * Auth: same-origin check (browser session required).
 * All records are scoped to the tenant resolved from the Host header.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api-security";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

// ── Resolve tenant slug from Host header ──────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── GET — list users ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .order("invited_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

// ── POST — invite user ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  let body: { name?: string; email?: string; roles?: string[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }
  if (!body.email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .insert({
      tenant_slug:  tenantSlug,
      email:        body.email.toLowerCase().trim(),
      name:         body.name.trim(),
      roles:        body.roles ?? [],
      status:       "pending",
      invited_at:   new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return NextResponse.json({ error: "This email is already in the workspace." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data }, { status: 201 });
}

// ── PATCH — update user ───────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  let body: { email?: string; roles?: string[]; status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.roles  !== undefined) patch.roles  = body.roles;
  if (body.status !== undefined) patch.status = body.status;

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update(patch)
    .eq("tenant_slug", tenantSlug)
    .eq("email", body.email.toLowerCase())
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

// ── DELETE — remove user ──────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email query param required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("tenant_users")
    .delete()
    .eq("tenant_slug", tenantSlug)
    .eq("email", email.toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
