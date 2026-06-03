/**
 * GET /api/connectors/salesforce/data?configId=<uuid>&type=opportunities|contacts|stats
 *
 * Server-side proxy — reads the httpOnly token cookie for this configId,
 * calls Salesforce, returns typed JSON.
 *
 * Role-based data scoping (AI Data Access Governance):
 *   1. Client sends X-User-Email header with the MSAL account email.
 *   2. We look up the user's roles in tenant_users.
 *   3. We look up connector_access_rules for this tenant + connector + role.
 *   4. Most-permissive rule wins if user has multiple roles.
 *   5. data_scope: "all" → no filter | "team" → self+reports | "own" → self only | "none" → 403
 *
 * Salesforce's own token permissions are the primary security barrier.
 * This scoping controls what data flows into the AI context on top of that.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { getOpportunities, getContacts, getDashboardStats } from "@/lib/connectors/salesforce/client";

export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────────────────────

type DataScope = "all" | "team" | "own" | "none";

interface AccessRule {
  ai_enabled: boolean;
  data_scope:  DataScope;
}

// Scope precedence — higher index = more permissive
const SCOPE_ORDER: DataScope[] = ["none", "own", "team", "all"];

function mostPermissive(scopes: DataScope[]): DataScope {
  return scopes.reduce((best, s) =>
    SCOPE_ORDER.indexOf(s) > SCOPE_ORDER.indexOf(best) ? s : best,
    "none" as DataScope
  );
}

// ── Tenant slug from Host ─────────────────────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/** Try to get refresh token — cookie first, then Supabase cross-device store */
async function getRefreshToken(
  configId: string,
  short: string,
  tenantSlug: string,
  userEmail: string | null
): Promise<string | null> {
  const jar = await cookies();
  const cookieRefresh = jar.get(`sf_refresh_${short}`)?.value;
  if (cookieRefresh) return cookieRefresh;

  // Fall back to Supabase (cross-device)
  if (!userEmail) return null;
  try {
    const { data } = await supabaseAdmin
      .from("connector_tokens")
      .select("refresh_token")
      .eq("tenant_slug", tenantSlug)
      .eq("user_email",  userEmail)
      .eq("config_id",   configId)
      .maybeSingle();
    return data?.refresh_token ?? null;
  } catch {
    return null;
  }
}

async function refreshToken(
  configId: string,
  short: string,
  tenantSlug: string,
  userEmail: string | null
): Promise<{ access_token: string; instance_url: string } | null> {
  const refresh = await getRefreshToken(configId, short, tenantSlug, userEmail);
  if (!refresh) return null;

  const { data: config } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret")
    .eq("id", configId)
    .single();

  if (!config) return null;

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     config.client_id,
    client_secret: config.client_secret,
    refresh_token: refresh,
  });

  const res = await fetch(`${config.instance_url}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string; instance_url: string }>;
}

// ── Resolve effective data scope for a user ───────────────────────────────────

async function resolveScope(
  tenantSlug: string,
  connectorType: string,
  userEmail: string | null
): Promise<{ scope: DataScope; email: string | null }> {
  // If no user email provided, fall back to "own" with no email (no filter possible → show nothing for scoped queries)
  if (!userEmail) return { scope: "own", email: null };

  // 1. Fetch user's roles from tenant_users
  const { data: userRow } = await supabaseAdmin
    .from("tenant_users")
    .select("roles")
    .eq("tenant_slug", tenantSlug)
    .eq("email", userEmail.toLowerCase())
    .maybeSingle();

  const roles: string[] = userRow?.roles ?? [];

  // 2. If user is Admin (or no roles configured), apply default Admin=all scope
  //    This is the system default when no explicit rules are saved yet.
  const SYSTEM_DEFAULTS: Record<string, DataScope> = {
    Admin:   "all",
    Manager: "team",
    Member:  "own",
  };

  // 3. Fetch configured access rules for this tenant + connector
  const { data: rules } = await supabaseAdmin
    .from("connector_access_rules")
    .select("role, ai_enabled, data_scope")
    .eq("tenant_slug", tenantSlug)
    .eq("connector_type", connectorType);

  const ruleMap = new Map<string, AccessRule>(
    (rules ?? []).map((r) => [r.role, { ai_enabled: r.ai_enabled, data_scope: r.data_scope as DataScope }])
  );

  // 4. Compute effective scope — most permissive across all user roles
  const effectiveScopes: DataScope[] = [];

  for (const role of roles) {
    const rule = ruleMap.get(role);
    if (rule) {
      // Explicit rule configured by admin
      if (!rule.ai_enabled) {
        effectiveScopes.push("none");
      } else {
        effectiveScopes.push(rule.data_scope);
      }
    } else {
      // No explicit rule → fall back to system default for this role
      effectiveScopes.push(SYSTEM_DEFAULTS[role] ?? "own");
    }
  }

  // If user has no roles at all, default to "own"
  if (effectiveScopes.length === 0) effectiveScopes.push("own");

  const scope = mostPermissive(effectiveScopes);
  return { scope, email: userEmail };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const configId = req.nextUrl.searchParams.get("configId");
  const type     = req.nextUrl.searchParams.get("type") ?? "opportunities";

  if (!configId) return NextResponse.json({ error: "configId required" }, { status: 400 });

  // Resolve identity first — needed for both token fallback and data scoping
  const userEmail  = req.headers.get("x-user-email")?.toLowerCase().trim() ?? null;
  const tenantSlug = await getTenantSlug(req);

  const short = configId.replace(/-/g, "").slice(0, 12);
  const jar   = await cookies();

  let token       = jar.get(`sf_token_${short}`)?.value;
  let instanceUrl = jar.get(`sf_inst_${short}`)?.value;

  if (!token || !instanceUrl) {
    // Try refresh — checks cookie first, then Supabase cross-device store
    const refreshed = await refreshToken(configId, short, tenantSlug, userEmail);
    if (refreshed) {
      token       = refreshed.access_token;
      instanceUrl = refreshed.instance_url;
    } else {
      return NextResponse.json({ error: "not_connected" }, { status: 401 });
    }
  }

  // connector_type for Salesforce is always "salesforce"
  const { scope, email: scopedEmail } = await resolveScope(tenantSlug, "salesforce", userEmail);

  // "none" = AI is blocked from seeing this connector's data for this user
  if (scope === "none") {
    return NextResponse.json({ error: "ai_access_denied" }, { status: 403 });
  }

  // Build ownerScope param — undefined means no filter (all scope)
  const ownerScope =
    (scope === "own" || scope === "team") && scopedEmail
      ? { scope: scope as "own" | "team", email: scopedEmail }
      : undefined;

  // ── Fetch data with scope applied ───────────────────────────────────────────
  try {
    let data: unknown;
    switch (type) {
      case "opportunities":
        data = await getOpportunities(instanceUrl, token, 10, ownerScope);
        break;
      case "contacts":
        // Contacts: scope by reporting manager or self (no ownerScope for contacts)
        data = await getContacts(instanceUrl, token);
        break;
      case "stats":
        data = await getDashboardStats(instanceUrl, token, ownerScope);
        break;
      default:
        return NextResponse.json({ error: "unknown_type" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("401")) {
      const refreshed = await refreshToken(configId, short, tenantSlug, userEmail);
      if (refreshed) {
        let retryData: unknown;
        switch (type) {
          case "opportunities":
            retryData = await getOpportunities(refreshed.instance_url, refreshed.access_token, 10, ownerScope);
            break;
          case "contacts":
            retryData = await getContacts(refreshed.instance_url, refreshed.access_token);
            break;
          case "stats":
            retryData = await getDashboardStats(refreshed.instance_url, refreshed.access_token, ownerScope);
            break;
        }
        const res = NextResponse.json(retryData);
        const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 8 };
        res.cookies.set(`sf_token_${short}`, refreshed.access_token, opts);
        res.cookies.set(`sf_inst_${short}`,  refreshed.instance_url,  opts);
        return res;
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
