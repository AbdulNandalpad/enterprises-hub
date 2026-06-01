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

  // Accept either iCal URL or CalDAV credentials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = body as any;
  // Normalise webcal:// → https:// (IONOS and most providers emit webcal:// links)
  if (b?.type === "ical-url" && typeof b?.url === "string" && b.url.startsWith("webcal://")) {
    b.url = "https://" + b.url.slice("webcal://".length);
  }

  const isIcalUrl = b?.type === "ical-url" && typeof b?.url === "string" && b.url.startsWith("http");
  if (!isIcalUrl && !isValidCalDavCredentials(body)) {
    return NextResponse.json({ error: "Invalid credentials — provide an iCal URL or CalDAV server/email/password." }, { status: 400 });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookie = buildCalDavCookie(isIcalUrl ? b : body, isProduction);

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
