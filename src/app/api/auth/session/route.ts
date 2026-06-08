/**
 * /api/auth/session
 *
 * POST   — Exchange an MSAL ID token for a server-side session cookie.
 *          Verifies the Azure AD token, looks up the user's role in Supabase,
 *          and issues a signed eh-session httpOnly cookie.
 *
 * DELETE — Sign out: clear the eh-session cookie.
 *
 * Called by AuthGuard immediately after MSAL authentication succeeds.
 * This is the bridge between client-side MSAL state and server-verified identity.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse }         from "next/server";
import { verifyAzureIdToken }                from "@/lib/azure-auth";
import { createSessionToken, SESSION_COOKIE, SESSION_TTL } from "@/lib/session";
import { assertSameOrigin, checkRateLimit, getClientIp }   from "@/lib/api-security";
import { getTenantByDomainFromDB }           from "@/lib/tenant/db";
import { getStaticTenantByDomain }           from "@/lib/tenant/registry";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try { const t = await getTenantByDomainFromDB(host); if (t) return t.slug; } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── POST — issue session ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  // Rate limit: 20 / min per IP — prevents token-stuffing
  const ip = getClientIp(req);
  const rl = checkRateLimit(`auth-session:${ip}`, 20, 60_000);
  if (rl) return rl;

  // Extract ID token from Authorization header
  const auth    = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!idToken) {
    return NextResponse.json({ error: "Authorization: Bearer <id_token> required" }, { status: 401 });
  }

  // Verify the Azure AD ID token
  const claims = await verifyAzureIdToken(idToken);
  if (!claims) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Look up role in Supabase
  const tenantSlug = await getTenantSlug(req);
  let role = "";
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/server");
    const { data } = await supabaseAdmin
      .from("tenant_users")
      .select("roles")
      .eq("tenant_slug", tenantSlug)
      .eq("email", claims.email)
      .maybeSingle();
    const roles: string[] = Array.isArray(data?.roles) ? data.roles : [];
    role = roles.includes("Admin")   ? "Admin"
         : roles.includes("Manager") ? "Manager"
         : roles[0] ?? "Member";
  } catch {
    // Supabase unavailable — issue session with no role (admin routes will still block)
    role = "";
  }

  // Issue signed session cookie
  const token = await createSessionToken({ email: claims.email, role, tenantSlug });
  const res   = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path:     "/",
    maxAge:   SESSION_TTL,
    secure:   process.env.NODE_ENV === "production",
  });
  return res;
}

// ── DELETE — sign out ─────────────────────────────────────────────────────────

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
