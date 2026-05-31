/**
 * /api/connectors/imap/config
 *
 * Manages IMAP credentials storage.
 * Credentials are stored in a scoped httpOnly cookie (Path=/api/connectors/imap)
 * so they are NEVER sent to page requests or other API routes.
 *
 * POST  { host, port, user, pass, tls } — validate + save credentials
 * GET                                   — check if credentials are configured
 * DELETE                                — remove credentials
 *
 * Security: CSRF guard on all mutating methods.
 * The saved password is never returned to the client — only a boolean "configured" flag.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildImapCookie,
  buildClearImapCookie,
  readImapCredentials,
  isValidImapCredentials,
} from "@/lib/api-security";

const isProd = process.env.NODE_ENV === "production";

// ── POST — validate + save credentials ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidImapCredentials(body)) {
    return NextResponse.json(
      {
        error:
          "Invalid credentials. Required: host (string), port (number), user (email), pass (string), tls (boolean).",
      },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, configured: true });
  res.headers.set("Set-Cookie", buildImapCookie(body, isProd));
  return res;
}

// ── GET — check if credentials are stored (boolean only, no values) ───────────
export async function GET() {
  const creds = await readImapCredentials();
  // Return only safe metadata — never the actual credentials
  if (!creds) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true,
    user: creds.user,   // show email so the user knows which account is wired
    host: creds.host,
  });
}

// ── DELETE — clear credentials ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const res = NextResponse.json({ ok: true, configured: false });
  res.headers.set("Set-Cookie", buildClearImapCookie());
  return res;
}
