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
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const VALID_ROLES   = ["Admin", "Manager", "Member"] as const;
const VALID_STATUSES = ["active", "pending", "suspended"] as const;

const InviteSchema = z.object({
  name:  z.string().min(1).max(128).trim(),
  email: z.string().email("Invalid email address").max(256).toLowerCase(),
  roles: z.array(z.enum(VALID_ROLES)).optional().default([]),
});

const PatchSchema = z.object({
  email:  z.string().email().max(256).toLowerCase(),
  roles:  z.array(z.enum(VALID_ROLES)).optional(),
  status: z.enum(VALID_STATUSES).optional(),
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

// ── GET — list users ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .order("invited_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

// ── POST — invite user ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InviteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, roles } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .insert({
      tenant_slug: tenantSlug,
      email,
      name,
      roles,
      status:     "pending",
      invited_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return NextResponse.json({ error: "This email is already in the workspace." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }

  return NextResponse.json({ user: data }, { status: 201 });
}

// ── PATCH — update user ───────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, roles, status } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (roles  !== undefined) patch.roles  = roles;
  if (status !== undefined) patch.status = status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update(patch)
    .eq("tenant_slug", tenantSlug)
    .eq("email", email)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  return NextResponse.json({ user: data });
}

// ── DELETE — remove user ──────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const originErr = await assertAdmin(req);
  if (originErr) return originErr;

  const tenantSlug = await getTenantSlug(req);
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email query param required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("tenant_users")
    .delete()
    .eq("tenant_slug", tenantSlug)
    .eq("email", email);

  if (error) return NextResponse.json({ error: "Failed to remove user" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
