/**
 * Next.js Edge Middleware
 *
 * Handles three things:
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
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AI_READINESS_HOSTNAME_PREFIX = "ai-readiness.";

/** Hostnames that should serve the marketing landing page at / (not /login). */
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
    // Internal Next.js assets and favicon — pass through silently
    if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
      return NextResponse.next();
    }

    // Already on the right path — pass through and stamp the public header
    if (isPublicPath) {
      const res = NextResponse.next();
      res.headers.set("x-is-public", "1");
      return res;
    }

    // Everything else: redirect to /ai-readiness[path]
    // e.g. / → /ai-readiness, /analyse → /ai-readiness/analyse
    const url = request.nextUrl.clone();
    url.pathname = "/ai-readiness" + (pathname === "/" ? "" : pathname);
    return NextResponse.redirect(url);
  }

  // ── Tenant domain root redirect ───────────────────────────────────────────
  // On tenant white-label domains (e.g. hub.servicesphere.de), visiting / would
  // serve the EnterpriseHub marketing page — send them to /login instead.
  if (pathname === "/" && !isPrimaryHost(hostname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
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
