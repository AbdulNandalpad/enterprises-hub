/**
 * Next.js Edge Middleware
 *
 * Handles subdomain routing so that ai-readiness.enterprises-hub.de
 * serves the /ai-readiness pages without triggering Azure AD auth.
 *
 * When a request arrives on the ai-readiness subdomain:
 *   /           → redirect to /ai-readiness
 *   /analyse    → redirect to /ai-readiness/analyse
 *   /done       → redirect to /ai-readiness/done
 *
 * Using a redirect (not a rewrite) ensures the browser URL changes to
 * /ai-readiness/... so that AuthProvider's pathname check correctly
 * identifies it as a public route and skips MSAL initialisation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AI_READINESS_HOSTNAME_PREFIX = "ai-readiness.";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  // Only act on the ai-readiness subdomain
  if (!hostname.startsWith(AI_READINESS_HOSTNAME_PREFIX)) {
    return NextResponse.next();
  }

  // Already on an /ai-readiness path or an internal Next.js path — let it through
  if (
    pathname.startsWith("/ai-readiness") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/ai-readiness") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Redirect everything else to /ai-readiness[path]
  // e.g. / → /ai-readiness, /analyse → /ai-readiness/analyse
  const url = request.nextUrl.clone();
  url.pathname = "/ai-readiness" + (pathname === "/" ? "" : pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files (_next/static, _next/image, favicon).
     * The middleware only acts when the hostname matches — all other requests
     * pass through untouched.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
