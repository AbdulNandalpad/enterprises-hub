/**
 * /api/superadmin/tenants
 *
 * Full CRUD for tenant management. Protected by superadmin middleware (sa-token cookie).
 *
 * GET    → list all tenants
 * POST   → create a new tenant
 * PATCH  → update an existing tenant (slug in body)
 * DELETE → delete a tenant (slug in query param)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  getAllTenantsFromDB,
  createTenant,
  updateTenant,
  deleteTenant,
  type TenantInput,
} from "@/lib/tenant/db";

// ── Auth check ────────────────────────────────────────────────────────────────

function assertSuperadmin(req: NextRequest): NextResponse | null {
  const saToken  = req.cookies.get("sa-token")?.value;
  const saSecret = process.env.SUPERADMIN_SECRET;
  if (!saSecret || saToken !== saSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ── GET — list all tenants ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  try {
    const tenants = await getAllTenantsFromDB();
    return NextResponse.json({ tenants });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ── POST — create tenant ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const b = body as Partial<TenantInput>;
  if (!b.slug || !b.name || !b.domain || !b.brandName || !b.primaryColor || !b.plan) {
    return NextResponse.json({ error: "Missing required fields: slug, name, brandName, primaryColor, domain, plan" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(b.slug)) {
    return NextResponse.json({ error: "Slug must be lowercase alphanumeric and hyphens only" }, { status: 400 });
  }

  try {
    const tenant = await createTenant(b as TenantInput);
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "A tenant with that slug or domain already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PATCH — update tenant ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const b = body as { slug: string } & Partial<TenantInput> & { active?: boolean };
  if (!b.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const tenant = await updateTenant(b.slug, b);
    return NextResponse.json({ tenant });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ── DELETE — remove tenant ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug query param required" }, { status: 400 });
  if (slug === "default") return NextResponse.json({ error: "Cannot delete the default tenant" }, { status: 400 });

  try {
    await deleteTenant(slug);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
