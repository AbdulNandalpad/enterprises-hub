import { NextResponse } from "next/server";
import { redeemAuthCode } from "@/identity/azure";
import { findTenantBySsoOrg, controlPlane } from "@/data/control-plane";
import { createSessionToken, SESSION_COOKIE } from "@/gateway/session";
import { EnvMissingError } from "@/core/env";
import type { Role } from "@/core/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/eh-oauth-state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=state", url.origin));
  }

  try {
    const identity = await redeemAuthCode(code);
    const tenant = await findTenantBySsoOrg(identity.directoryId);
    if (!tenant || tenant.status !== "active") {
      return NextResponse.redirect(new URL("/login?error=no-tenant", url.origin));
    }

    // Upsert the user in the tenant's own schema; role survives re-login.
    // Bootstrap rule: the FIRST user of a fresh tenant becomes its
    // company_admin — later users default to member until promoted.
    const sql = controlPlane();
    const existing = await sql.unsafe(
      `select 1 from ${tenant.schemaName}.tenant_users limit 1`,
    );
    const initialRole = existing.length === 0 ? "company_admin" : "member";
    const rows = await sql.unsafe(
      `insert into ${tenant.schemaName}.tenant_users (sub, email, name, role)
       values ($1, $2, $3, $4)
       on conflict (sub) do update set email = excluded.email, name = excluded.name
       returning role`,
      [identity.sub, identity.email, identity.name, initialRole],
    );
    const role = (rows[0]?.role === "company_admin" ? "company_admin" : "member") as Role;

    const token = await createSessionToken({
      sub: identity.sub,
      name: identity.name,
      email: identity.email,
      tenantSlug: tenant.slug,
      role,
    });
    const res = NextResponse.redirect(new URL("/", url.origin));
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 8 * 3600, path: "/",
    });
    res.cookies.delete("eh-oauth-state");
    return res;
  } catch (err) {
    if (err instanceof EnvMissingError) {
      console.error("callback: missing env", err.variable);
      return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });
    }
    console.error("callback: failed", err);
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }
}
