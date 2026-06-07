/**
 * Admin-route protection helper.
 *
 * Import assertAdmin (instead of assertSameOrigin) in every /api/admin/* route.
 * It stacks three checks in order:
 *
 *  1. Demo rejection — demo sessions must never reach admin APIs.
 *     The eh-demo cookie indicates a demo session (the value is HMAC-signed;
 *     AuthGuard validates it on the client, but we also reject it here so that
 *     even a forged cookie cannot reach admin endpoints).
 *
 *  2. Same-origin check — rejects cross-origin requests with a mismatched
 *     Origin header (blocks CSRF from third-party pages).
 *
 *  3. Origin required for write operations — GET/OPTIONS may proceed without
 *     an Origin header (same-site browser navigations don't always send one),
 *     but POST / PATCH / PUT / DELETE must have it.  This prevents curl/Postman
 *     from modifying tenant data without going through the browser UI.
 *
 * TODO (next iteration): add MSAL access-token verification.
 *   Pass `Authorization: Bearer <msal_access_token>` from the admin UI and
 *   validate it against the Azure AD JWKS endpoint.  Until that is in place,
 *   data is protected by tenant scoping (Host header → slug), same-origin, and
 *   the assumption that admin UI pages are only rendered for authenticated users.
 */

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api-security";

export function assertAdmin(req: NextRequest): NextResponse | null {
  // ── 1. Reject demo sessions ───────────────────────────────────────────────
  // Any eh-demo cookie value means a demo session — even if it's forged.
  // Real tenant admins authenticate via Azure AD, never via the demo passcode.
  const demoCookie = req.cookies.get("eh-demo")?.value;
  if (demoCookie) {
    return NextResponse.json(
      { error: "Admin access is not available in demo mode." },
      { status: 403 }
    );
  }

  // ── 2. Same-origin check ──────────────────────────────────────────────────
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  // ── 3. Require Origin header for state-changing methods ───────────────────
  const method = req.method.toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (!isReadOnly) {
    const origin = req.headers.get("origin");
    if (!origin) {
      return NextResponse.json(
        { error: "Origin header is required for write operations." },
        { status: 403 }
      );
    }
  }

  return null; // all checks passed
}
