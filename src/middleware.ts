/**
 * Next.js Edge Middleware
 *
 * Handles two things:
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
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AI_READINESS_HOSTNAME_PREFIX = "ai-readiness.";

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
