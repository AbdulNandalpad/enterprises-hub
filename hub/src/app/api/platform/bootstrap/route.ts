import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { timingSafeEqual } from "crypto";
import { requireEnv, EnvMissingError } from "@/core/env";
import { controlPlane, findTenantBySlug } from "@/data/control-plane";
import { provisionTenant } from "@/data/provisioning";
import { checkRateLimit } from "@/gateway/rate-limit";

/**
 * One-shot platform bootstrap (idempotent): applies control-plane
 * migrations, then provisions the demo tenant bound to the founder's
 * Entra directory. Guarded by PLATFORM_ADMIN_SECRET — the control
 * plane's central admin credential, never a client-facing surface.
 *
 *   curl -X POST https://<app>/api/platform/bootstrap \
 *        -H "x-platform-secret: $PLATFORM_ADMIN_SECRET"
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`bootstrap:${ip}`, 5, 15 * 60)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  try {
    const expected = Buffer.from(requireEnv("PLATFORM_ADMIN_SECRET"));
    const given = Buffer.from(request.headers.get("x-platform-secret") ?? "");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Control-plane migrations (same files scripts/migrate.mjs applies)
    const sql = controlPlane();
    await sql`create schema if not exists control_plane`;
    await sql`create table if not exists control_plane.migrations (
      id text primary key, applied_at timestamptz not null default now())`;
    const dir = join(process.cwd(), "src/data/migrations");
    const files = readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
    const applied: string[] = [];
    for (const file of files) {
      const done = await sql`select 1 from control_plane.migrations where id = ${file}`;
      if (done.length) continue;
      await sql.unsafe(readFileSync(join(dir, file), "utf8"));
      await sql`insert into control_plane.migrations (id) values (${file})`;
      applied.push(file);
    }

    // 2. Demo tenant — a completely normal tenant (settled decision),
    //    bound to the founder's Entra directory for sign-in.
    let demo = await findTenantBySlug("demo");
    let provisioned = false;
    if (!demo) {
      demo = await provisionTenant({
        slug: "demo",
        name: "EnterpriseHub Demo",
        ssoOrgId: requireEnv("AZURE_AD_TENANT_ID"),
        region: "eu-frankfurt",
      });
      provisioned = true;
    }

    return NextResponse.json({
      ok: true,
      migrationsApplied: applied,
      demoTenant: { slug: demo.slug, status: demo.status, provisioned },
    });
  } catch (err) {
    if (err instanceof EnvMissingError) {
      console.error("bootstrap: missing env", err.variable);
      return NextResponse.json({ error: "Platform is not configured." }, { status: 503 });
    }
    console.error("bootstrap: failed", err);
    return NextResponse.json({ error: "Bootstrap failed." }, { status: 500 });
  }
}
