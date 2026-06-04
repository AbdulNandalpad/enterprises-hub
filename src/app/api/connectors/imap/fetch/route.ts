/**
 * /api/connectors/imap/fetch
 *
 * Fetches recent emails from the user's IMAP inbox.
 * Credentials are loaded from Supabase for the user identified by X-User-Email header.
 * Each user sees ONLY their own mailbox — no cross-user leakage.
 *
 * POST { limit?: number }  — returns last N emails (default 10, max 20)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { assertSameOrigin } from "@/lib/api-security";
import { extractVerifiedEmail } from "@/lib/server/verify-msal-token";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { decryptPassword } from "@/lib/connectors/imap/encrypt";
import type { ImapMessage } from "@/lib/connectors/imap/types";

const DEFAULT_LIMIT      = 10;
const MAX_LIMIT          = 20;
const CONNECT_TIMEOUT_MS = 8000;

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fallback */ }
  return getStaticTenantByDomain(host).slug;
}

interface ImapRow {
  host:      string;
  port:      number;
  imap_user: string;
  pass_enc:  string;
  tls:       boolean;
}

async function getCredentials(req: NextRequest): Promise<{ host: string; port: number; user: string; pass: string; tls: boolean } | null> {
  const userEmail = await extractVerifiedEmail(req);
  if (!userEmail) return null;

  const tenantSlug = await getTenantSlug(req);

  const { data } = await supabaseAdmin
    .from("user_imap_configs")
    .select("host, port, imap_user, pass_enc, tls")
    .eq("tenant_slug", tenantSlug)
    .eq("user_email", userEmail)
    .maybeSingle();

  if (!data) return null;

  const row = data as ImapRow;
  try {
    const pass = decryptPassword(row.pass_enc);
    return { host: row.host, port: row.port, user: row.imap_user, pass, tls: row.tls };
  } catch {
    return null; // decryption failed — credentials stale or key changed
  }
}

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const creds = await getCredentials(req);
  if (!creds) {
    return NextResponse.json(
      { error: "IMAP not configured. Add credentials in Settings → Connections." },
      { status: 401 }
    );
  }

  let limit = DEFAULT_LIMIT;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.limit === "number") {
      limit = Math.min(Math.max(1, body.limit), MAX_LIMIT);
    }
  } catch { /* use default */ }

  const client = new ImapFlow({
    host:     creds.host,
    port:     creds.port,
    secure:   creds.tls,
    auth:     { user: creds.user, pass: creds.pass },
    logger:   false,
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout:   CONNECT_TIMEOUT_MS,
    socketTimeout:     CONNECT_TIMEOUT_MS,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    const messages: ImapMessage[] = [];

    try {
      const mailbox = client.mailbox;
      const total = (mailbox && typeof mailbox === "object" && "exists" in mailbox)
        ? (mailbox as { exists: number }).exists
        : 0;

      if (total > 0) {
        const start = Math.max(1, total - limit + 1);
        const range  = `${start}:${total}`;

        for await (const msg of client.fetch(range, { envelope: true })) {
          const env = msg.envelope;
          if (!env) continue;
          const fromAddr = env.from?.[0];
          const from = fromAddr ? (fromAddr.name || fromAddr.address || "Unknown") : "Unknown";
          messages.push({
            uid:     msg.uid,
            subject: env.subject ?? "(no subject)",
            from,
            date:    env.date?.toISOString() ?? new Date().toISOString(),
            snippet: "",
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    messages.reverse();
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[/api/connectors/imap/fetch] IMAP error:", err);
    await client.logout().catch(() => {});
    return NextResponse.json(
      { error: "Could not connect to mail server. Check your credentials." },
      { status: 502 }
    );
  }
}
