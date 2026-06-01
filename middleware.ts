/**
 * Next.js Edge Middleware
 *
 * Runs on every request before rendering.
 *
 * Responsibilities:
 * 1. Tenant resolution — detects the hostname, resolves the tenant, sets
 *    the `eh-tenant` cookie so TenantContext can read it client-side.
 *
 * 2. Superadmin protection — redirects /superadmin/* to the login page
 *    unless the `sa-token` cookie matches SUPERADMIN_SECRET.
 *
 * 3. Inactive tenant gate — returns 403 if the matched tenant is inactive.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTenantByDomain } from "@/lib/tenant/registry";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Skip static assets ──────────────────────────────────────────────────────
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // ── Resolve tenant from hostname ────────────────────────────────────────────
  const hostname = req.headers.get("host") ?? "";
  const tenant = getTenantByDomain(hostname);

  // ── Inactive tenant gate ────────────────────────────────────────────────────
  if (!tenant.active && tenant.slug !== "default") {
    return new NextResponse("This workspace is currently inactive. Contact support@enterprises-hub.de.", {
      status: 403,
    });
  }

  // ── Superadmin protection ───────────────────────────────────────────────────
  if (pathname.startsWith("/superadmin")) {
    const saToken = req.cookies.get("sa-token")?.value;
    const saSecret = process.env.SUPERADMIN_SECRET;

    const isLoginPage = pathname === "/superadmin/login";
    const isAuthed = saSecret && saToken === saSecret;

    if (!isAuthed && !isLoginPage) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }
    if (isAuthed && isLoginPage) {
      return NextResponse.redirect(new URL("/superadmin", req.url));
    }
  }

  // ── Set tenant cookie (readable client-side) ────────────────────────────────
  const res = NextResponse.next();
  res.cookies.set("eh-tenant", tenant.slug, {
    path: "/",
    httpOnly: false,   // must be readable by TenantContext in the browser
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * This keeps the middleware fast — it only runs on real page/API requests.
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
