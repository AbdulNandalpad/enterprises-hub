/**
 * Next.js Edge Middleware
 *
 * Runs on every request before rendering.
 *
 * Tenant resolution strategy (performance-first):
 *   1. If `eh-tenant` cookie already set → reuse it (zero DB queries).
 *   2. On first visit (no cookie) → fetch tenant from Supabase REST API.
 *   3. If Supabase unavailable → fall back to static registry.
 *
 * This means Supabase is queried at most ONCE per browser session (cookie lasts 24h).
 * All subsequent page loads in the same session reuse the cookie value.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { verifySaSession } from "@/lib/superadmin-auth";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Supabase REST fetch (Edge-compatible, no SDK needed) ──────────────────────

interface TenantRow {
  slug: string;
  name: string;
  brand_name: string;
  primary_color: string;
  domain: string;
  active: boolean;
}

async function fetchTenantByDomain(hostname: string): Promise<{ slug: string; active: boolean } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;

  const host = hostname.replace(/:\d+$/, "").toLowerCase();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?domain=eq.${encodeURIComponent(host)}&select=slug,active&limit=1`,
      {
        headers: {
          apikey:        SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          Accept:        "application/json",
        },
        signal: AbortSignal.timeout(2000), // 2s max — fast fail
      }
    );

    if (!res.ok) return null;
    const rows = await res.json() as TenantRow[];
    if (!rows.length) return null;
    return { slug: rows[0].slug, active: rows[0].active };
  } catch {
    return null; // Timeout / network error → fall back to static
  }
}

// ── Also handle auto-subdomains: <slug>.enterprises-hub.de ───────────────────

async function fetchTenantBySlug(slug: string): Promise<{ slug: string; active: boolean } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}&select=slug,active&limit=1`,
      {
        headers: {
          apikey:        SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          Accept:        "application/json",
        },
        signal: AbortSignal.timeout(2000),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json() as TenantRow[];
    return rows[0] ? { slug: rows[0].slug, active: rows[0].active } : null;
  } catch {
    return null;
  }
}

// ── Main middleware ───────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  // ── Superadmin protection ───────────────────────────────────────────────────
  if (pathname.startsWith("/superadmin")) {
    const saToken  = req.cookies.get("sa-token")?.value;
    const saSecret = process.env.SUPERADMIN_SECRET;
    const isLoginPage = pathname === "/superadmin/login";
    // Use timing-safe HMAC session verification (CRIT-1, CRIT-2)
    const isAuthed = !!(saSecret && saToken && verifySaSession(saToken, saSecret));
    if (!isAuthed && !isLoginPage) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }
    if (isAuthed && isLoginPage) {
      return NextResponse.redirect(new URL("/superadmin", req.url));
    }
    return NextResponse.next();
  }

  // ── Tenant resolution ───────────────────────────────────────────────────────

  // If the cookie is already set, trust it (no DB query needed)
  const existingSlug = req.cookies.get("eh-tenant")?.value;
  if (existingSlug) {
    return NextResponse.next();
  }

  // First visit — resolve from Supabase, fall back to static registry
  const hostname = req.headers.get("host") ?? "";
  const host = hostname.replace(/:\d+$/, "").toLowerCase();

  let slug = "default";
  let active = true;

  // Try Supabase first (exact domain match)
  const dbTenant = await fetchTenantByDomain(host);

  if (dbTenant) {
    slug = dbTenant.slug;
    active = dbTenant.active;
  } else {
    // Try auto-subdomain: <slug>.enterprises-hub.de
    const subMatch = host.match(/^([a-z0-9-]+)\.enterprises-hub\.de$/);
    if (subMatch) {
      const sub = await fetchTenantBySlug(subMatch[1]);
      if (sub) { slug = sub.slug; active = sub.active; }
      else {
        // Fall back to static registry
        const staticT = getStaticTenantByDomain(host);
        slug = staticT.slug; active = staticT.active;
      }
    } else {
      // Fall back to static registry
      const staticT = getStaticTenantByDomain(host);
      slug = staticT.slug; active = staticT.active;
    }
  }

  // ── Inactive tenant gate ────────────────────────────────────────────────────
  if (!active && slug !== "default") {
    return new NextResponse(
      "This workspace is currently inactive. Contact support@enterprises-hub.de.",
      { status: 403 }
    );
  }

  // ── Set tenant cookie ───────────────────────────────────────────────────────
  const res = NextResponse.next();
  res.cookies.set("eh-tenant", slug, {
    path: "/",
    httpOnly: false,   // must be readable by TenantContext in the browser
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours — re-resolved after that
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)" ],
};
