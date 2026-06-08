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
import { z } from "zod";
import {
  getAllTenantsFromDB,
  createTenant,
  updateTenant,
  deleteTenant,
} from "@/lib/tenant/db";
import { assertSuperadmin } from "@/lib/superadmin-auth";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const HEX_COLOR = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex colour, e.g. #1A3AC8");
const SLUG_RE   = /^[a-z0-9-]+$/;

const TenantCreateSchema = z.object({
  slug:         z.string().min(1).max(64).regex(SLUG_RE, "Slug must be lowercase alphanumeric and hyphens only"),
  name:         z.string().min(1).max(128).trim(),
  brandName:    z.string().min(1).max(128).trim(),
  primaryColor: HEX_COLOR,
  accentColor:  HEX_COLOR.optional(),
  domain:       z.string().min(1).max(253).toLowerCase().trim(),
  logoUrl:      z.string().url("Must be a valid URL").max(512).optional().or(z.literal("")),
  azureTenantId: z.string().uuid("Must be a valid Azure tenant UUID").optional().or(z.literal("")),
  plan:         z.enum(["trial", "starter", "pro"]),
  active:       z.boolean().optional().default(true),
  notes:        z.string().max(1024).trim().optional(),
});

const TenantPatchSchema = z.object({
  slug:         z.string().min(1).max(64),  // target — required, not updatable
  name:         z.string().min(1).max(128).trim().optional(),
  brandName:    z.string().min(1).max(128).trim().optional(),
  primaryColor: HEX_COLOR.optional(),
  accentColor:  HEX_COLOR.optional(),
  domain:       z.string().min(1).max(253).toLowerCase().trim().optional(),
  logoUrl:      z.string().url().max(512).optional().or(z.literal("")),
  azureTenantId: z.string().uuid().optional().or(z.literal("")),
  plan:         z.enum(["trial", "starter", "pro"]).optional(),
  active:       z.boolean().optional(),
  notes:        z.string().max(1024).trim().optional(),
});

// ── GET — list all tenants ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  try {
    const tenants = await getAllTenantsFromDB();
    return NextResponse.json({ tenants });
  } catch {
    return NextResponse.json({ error: "Failed to load tenants" }, { status: 500 });
  }
}

// ── POST — create tenant ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = TenantCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const tenant = await createTenant({
      ...input,
      logoUrl:       input.logoUrl       || undefined,
      azureTenantId: input.azureTenantId || undefined,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "A tenant with that slug or domain already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}

// ── PATCH — update tenant ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = TenantPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { slug, ...patch } = parsed.data;

  try {
    const tenant = await updateTenant(slug, patch);
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
