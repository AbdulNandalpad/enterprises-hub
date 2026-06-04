/**
 * Next.js Edge Middleware
 *
 * Handles four things:
 *
 * 1. Subdomain routing — ai-readiness.enterprises-hub.de
 *    Redirects bare paths to /ai-readiness/... so the browser URL reflects the
 *    correct Next.js route:
 *      /           → /ai-readiness
 *      /analyse    → /ai-readiness/analyse
 *      /done       → /ai-readiness/done
 *
 * 2. Public-route header — x-is-public: 1
 *    Set on every response that serves an /ai-readiness page (either because
 *    the request came in on the ai-readiness subdomain, or because the main
 *    domain is serving /ai-readiness directly).
 *
 *    AuthProvider.tsx (a Server Component) reads this header and passes
 *    isPublic={true} down to the client AuthProviderClient, which then skips
 *    MSAL initialisation entirely — no Azure AD redirect on public pages.
 *
 * 3. Tenant domain root redirect
 *    When a white-label tenant domain (e.g. hub.servicesphere.de) hits the root
 *    path /, the root route.ts would serve the EnterpriseHub marketing page —
 *    wrong for a tenant. Instead we redirect / → /login so the tenant sees
 *    their branded login page immediately.
 *    The primary domain (enterprises-hub.de) and local/preview origins are
 *    excluded so they still serve the marketing landing page as normal.
 *
 * 4. Tenant cookie — eh-tenant
 *    On every request from a white-label tenant domain, stamp the eh-tenant
 *    cookie so downstream API routes and Server Components can identify the
 *    tenant without a Supabase round-trip.  Primary domains are excluded
 *    (their tenant = "default", resolved from the Host header directly).
 *
 * ── Tenant onboarding checklist (repeat for every new customer) ─────────────
 *  [ ] DNS:      CNAME  hub.customer.com → cname.vercel-dns.com  (NOT a URL forward)
 *  [ ] Vercel:   Project → Settings → Domains → Add hub.customer.com
 *  [ ] Azure AD: App registrations → Authentication → Redirect URIs
 *                  add  https://hub.customer.com/login
 *  [ ] Supabase: INSERT into tenants (slug, name, domain, primary_color, plan)
 *  [ ] Test:     Open hub.customer.com in a fresh incognito window
 *                  → should land on /login with customer branding
 *                  → sign in → /dashboard → sign out → back to /login (same domain)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";

const AI_READINESS_HOSTNAME_PREFIX = "ai-readiness.";

/** Hostnames that serve the main EnterpriseHub marketing page at /. */
const PRIMARY_HOSTS = [
  "enterprises-hub.de",
  "www.enterprises-hub.de",
];

function isPrimaryHost(hostname: string): boolean {
  const host = hostname.replace(/:\d+$/, "").toLowerCase();
  return (
    PRIMARY_HOSTS.includes(host) ||
    host === "localhost" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".local")
  );
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  const isAIReadinessSubdomain = hostname.startsWith(AI_READINESS_HOSTNAME_PREFIX);
  const isPublicPath =
    pathname.startsWith("/ai-readiness") ||
    pathname.startsWith("/api/ai-readiness");

  // ── ai-readiness subdomain ────────────────────────────────────────────────
  if (isAIReadinessSubdomain) {
    if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
      return NextResponse.next();
    }
    if (isPublicPath) {
      const res = NextResponse.next();
      res.headers.set("x-is-public", "1");
      return res;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/ai-readiness" + (pathname === "/" ? "" : pathname);
    return NextResponse.redirect(url);
  }

  // ── Tenant domain handling ────────────────────────────────────────────────
  if (!isPrimaryHost(hostname)) {
    // 3. Root redirect: / → /login so tenant users never see the marketing page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // 4. Stamp eh-tenant cookie so Server Components and API routes always
    //    know which tenant they're serving, even without a Supabase round-trip.
    //    Uses the static registry as a fast edge-safe fallback; Supabase is the
    //    authoritative source for API routes that need the full config.
    const tenantSlug = getStaticTenantByDomain(hostname).slug;
    const res = NextResponse.next();
    res.cookies.set("eh-tenant", tenantSlug, {
      path:     "/",
      sameSite: "lax",
      secure:   true,
      httpOnly: false, // readable by client JS for TenantContext bootstrap
      maxAge:   60 * 60 * 24, // 24 h — refreshed on every request
    });
    return res;
  }

  // ── Main domain: stamp the public header for /ai-readiness paths ──────────
  if (isPublicPath) {
    const res = NextResponse.next();
    res.headers.set("x-is-public", "1");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files (_next/static, _next/image, favicon).
     * The middleware only acts when the hostname or path matches — all other
     * requests pass through untouched.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
