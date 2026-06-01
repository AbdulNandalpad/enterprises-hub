/**
 * /api/connectors/imap/fetch
 *
 * Fetches recent emails from the user's IMAP inbox.
 * Credentials are read from the httpOnly cookie (never from the request body).
 *
 * POST { limit?: number }  — returns last N emails (default 10, max 20)
 *
 * Security:
 * - CSRF guard
 * - Credentials from httpOnly cookie only — never the request body
 * - Connection timeout: 8s
 * - Returns only safe metadata (subject, from, date, snippet) — no raw MIME
 * - Internal errors are never leaked to the client
 *
 * Runtime: nodejs (imapflow requires Node.js TCP APIs)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { assertSameOrigin, readImapCredentials } from "@/lib/api-security";
import type { ImapMessage } from "@/lib/connectors/imap/types";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const CONNECT_TIMEOUT_MS = 8000;

export async function POST(req: NextRequest) {
  // ── CSRF guard ──────────────────────────────────────────────────────────────
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  // ── Read credentials from httpOnly cookie ───────────────────────────────────
  const creds = await readImapCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "IMAP not configured. Add credentials in Settings → Connectors." },
      { status: 401 }
    );
  }

  // ── Parse options ───────────────────────────────────────────────────────────
  let limit = DEFAULT_LIMIT;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.limit === "number") {
      limit = Math.min(Math.max(1, body.limit), MAX_LIMIT);
    }
  } catch { /* use default */ }

  // ── Connect + fetch ─────────────────────────────────────────────────────────
  const client = new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.tls,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
    // Connection timeout — critical for serverless (don't hang the function)
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout:   CONNECT_TIMEOUT_MS,
    socketTimeout:     CONNECT_TIMEOUT_MS,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    const messages: ImapMessage[] = [];

    try {
      // Fetch the N most recent messages (reverse sequence range)
      const mailbox = client.mailbox;
      const total = (mailbox && typeof mailbox === "object" && "exists" in mailbox)
        ? (mailbox as { exists: number }).exists
        : 0;

      if (total > 0) {
        const start = Math.max(1, total - limit + 1);
        const range  = `${start}:${total}`;

        // Fetch envelope only — bodyParts are unreliable across IMAP servers
        // and can cause the entire FETCH command to fail on strict servers (e.g. IONOS).
        // Snippets are omitted; subject + sender is enough for AI context.
        for await (const msg of client.fetch(range, { envelope: true })) {
          const env = msg.envelope;
          if (!env) continue;

          const fromAddr = env.from?.[0];
          const from = fromAddr
            ? (fromAddr.name || fromAddr.address || "Unknown")
            : "Unknown";

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

    // Return newest first
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
