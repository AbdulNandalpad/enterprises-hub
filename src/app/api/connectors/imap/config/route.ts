/**
 * /api/connectors/imap/config
 *
 * Per-user IMAP configuration — stored in Supabase keyed by the user's
 * Azure AD email (X-User-Email header). This means each person who logs in
 * sees ONLY their own mailbox, even on a shared machine.
 *
 * Password is AES-256-GCM encrypted before storage (src/lib/connectors/imap/encrypt.ts).
 * The raw password is NEVER returned to the client.
 *
 * POST  { host, port, user, pass, tls }  — save config for this user
 * GET                                    — check if config exists for this user
 * DELETE                                 — remove config for this user
 *
 * SQL (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS user_imap_configs (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     tenant_slug text NOT NULL,
 *     user_email  text NOT NULL,
 *     host        text NOT NULL,
 *     port        integer NOT NULL,
 *     imap_user   text NOT NULL,
 *     pass_enc    text NOT NULL,
 *     tls         boolean NOT NULL DEFAULT true,
 *     created_at  timestamptz DEFAULT now(),
 *     updated_at  timestamptz DEFAULT now(),
 *     UNIQUE (tenant_slug, user_email)
 *   );
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, isValidImapCredentials } from "@/lib/api-security";
import { extractVerifiedEmail } from "@/lib/server/verify-msal-token";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { encryptPassword } from "@/lib/connectors/imap/encrypt";

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

// ── POST — save credentials ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const userEmail = await extractVerifiedEmail(req);
  if (!userEmail) {
    return NextResponse.json({ error: "Valid authentication token required" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!isValidImapCredentials(body)) {
    return NextResponse.json(
      { error: "Invalid credentials. Required: host (string), port (number), user (email), pass (string), tls (boolean)." },
      { status: 400 }
    );
  }

  const creds = body as { host: string; port: number; user: string; pass: string; tls: boolean };
  const tenantSlug = await getTenantSlug(req);

  const passEnc = encryptPassword(creds.pass);

  const { error } = await supabaseAdmin
    .from("user_imap_configs")
    .upsert(
      {
        tenant_slug: tenantSlug,
        user_email:  userEmail,
        host:        creds.host,
        port:        creds.port,
        imap_user:   creds.user,
        pass_enc:    passEnc,
        tls:         creds.tls,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: "tenant_slug,user_email" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: true });
}

// ── GET — check if configured (returns metadata, never the password) ──────────

export async function GET(req: NextRequest) {
  const userEmail = await extractVerifiedEmail(req);
  if (!userEmail) return NextResponse.json({ configured: false });

  const tenantSlug = await getTenantSlug(req);

  const { data } = await supabaseAdmin
    .from("user_imap_configs")
    .select("host, imap_user")
    .eq("tenant_slug", tenantSlug)
    .eq("user_email", userEmail)
    .maybeSingle();

  if (!data) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, user: data.imap_user, host: data.host });
}

// ── DELETE — remove credentials ───────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const userEmail = await extractVerifiedEmail(req);
  if (!userEmail) return NextResponse.json({ error: "Valid authentication token required" }, { status: 401 });

  const tenantSlug = await getTenantSlug(req);

  const { error } = await supabaseAdmin
    .from("user_imap_configs")
    .delete()
    .eq("tenant_slug", tenantSlug)
    .eq("user_email", userEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configured: false });
}
