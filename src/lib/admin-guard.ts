/**
 * Admin-route protection helper — v2.
 *
 * assertAdmin is now async. All callers must await it.
 *
 * Stacks four checks in order:
 *
 *  1. Demo rejection   — demo sessions never reach admin APIs.
 *  2. Session cookie   — verifies the eh-session JWT issued by /api/auth/session
 *                        after Azure AD ID token verification. Confirms the caller
 *                        is a real, verified Azure AD identity with Admin/Manager role.
 *  3. Same-origin      — defense-in-depth CSRF protection.
 *  4. Origin required  — POST/PATCH/PUT/DELETE must include an Origin header.
 *
 * If SESSION_SECRET / Azure AD is not configured (demo-only deployment), step 2
 * falls back to same-origin-only — matching the old behaviour so the app still
 * works in environments without a full Azure AD setup.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin }          from "@/lib/api-security";
import { verifySessionToken }        from "@/lib/session";

const ADMIN_ROLES = new Set(["Admin", "Manager"]);

export async function assertAdmin(req: NextRequest): Promise<NextResponse | null> {
  // ── 1. Reject demo sessions ───────────────────────────────────────────────
  if (req.cookies.get("eh-demo")?.value) {
    return NextResponse.json(
      { error: "Admin access is not available in demo mode." },
      { status: 403 }
    );
  }

  // ── 2. Verify session cookie ──────────────────────────────────────────────
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

  // ── 3. Same-origin (defense-in-depth CSRF) ────────────────────────────────
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  // ── 4. Require Origin header for write operations ─────────────────────────
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
