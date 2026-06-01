/**
 * /api/connectors/caldav/config
 *
 * GET  → { configured, user, server }   (never returns password)
 * POST { server, user, pass }           → saves credentials in httpOnly cookie
 * DELETE                                → clears the cookie
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildCalDavCookie,
  buildClearCalDavCookie,
  readCalDavCredentials,
  isValidCalDavCredentials,
} from "@/lib/api-security";

export async function GET() {
  const creds = await readCalDavCredentials();
  if (!creds) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, user: creds.user, server: creds.server });
}

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!isValidCalDavCredentials(body)) {
    return NextResponse.json({ error: "Invalid credentials — server URL, email and password are required." }, { status: 400 });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookie = buildCalDavCookie(body, isProduction);

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildClearCalDavCookie(),
    },
  });
}
