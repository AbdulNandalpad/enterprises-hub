/**
 * Admin-route protection helper — v3.
 *
 * assertAdmin is async. All callers must await it.
 *
 * Stacks three checks in order:
 *
 *  1. Session cookie   — verifies the eh-session JWT.
 *                        For Azure AD users: issued by /api/auth/session after
 *                        Azure AD ID token verification.
 *                        For demo users: issued by /api/demo/auth at login time
 *                        with role=Admin, tenantSlug=default — giving demo users
 *                        full Admin access on the default (sandbox) tenant.
 *  2. Same-origin      — defense-in-depth CSRF protection.
 *  3. Origin required  — POST/PATCH/PUT/DELETE must include an Origin header.
 *
 * If SESSION_SECRET is not configured (early-stage deployment), step 1 falls
 * back to same-origin-only so the app still works without a full session setup.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin }          from "@/lib/api-security";
import { verifySessionToken }        from "@/lib/session";

const ADMIN_ROLES = new Set(["Admin", "Manager"]);

export async function assertAdmin(req: NextRequest): Promise<NextResponse | null> {
  // ── 1. Verify session cookie ──────────────────────────────────────────────
  // Only enforced when SESSION_SECRET is configured — allows graceful
  // degradation in demo-only / early-stage deployments.
  if (process.env.SESSION_SECRET) {
    const sessionToken = req.cookies.get("eh-session")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }
    const session = await verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }
    if (!ADMIN_ROLES.has(session.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }
  }

  // ── 2. Same-origin (defense-in-depth CSRF) ────────────────────────────────
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  // ── 3. Require Origin header for write operations ─────────────────────────
  const method     = req.method.toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (!isReadOnly && !req.headers.get("origin")) {
    return NextResponse.json(
      { error: "Origin header is required for write operations." },
      { status: 403 }
    );
  }

  return null;
}
