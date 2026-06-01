/**
 * /api/connectors/caldav/test
 *
 * Diagnostic endpoint — tries each candidate URL and returns the HTTP status
 * for each so we can see exactly where CalDAV is failing.
 *
 * POST {} → { results: { url, status, method }[] }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, readCalDavCredentials } from "@/lib/api-security";

export async function POST(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  const creds = await readCalDavCredentials();
  if (!creds) {
    return NextResponse.json({ error: "CalDAV not configured." }, { status: 401 });
  }

  const auth = "Basic " + Buffer.from(`${creds.user}:${creds.pass}`).toString("base64");
  const base = creds.server.replace(/\/$/, "");

  const candidates = [
    `${base}/`,
    `${base}/.well-known/caldav`,
    `${base}/calendars/${creds.user}/`,
    `${base}/calendars/${creds.user}/default/`,
    `${base}/calendars/${creds.user}/calendar/`,
    `${base}/dav/${creds.user}/calendar/`,
  ];

  const propfindBody = `<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>`;

  const results = await Promise.all(
    candidates.map(async (url) => {
      // Try PROPFIND
      try {
        const res = await fetch(url, {
          method: "PROPFIND",
          headers: {
            Authorization: auth,
            Depth: "0",
            "Content-Type": "application/xml; charset=utf-8",
          },
          body: propfindBody,
          signal: AbortSignal.timeout(8000),
        });
        const text = await res.text().catch(() => "");
        return {
          url,
          method: "PROPFIND",
          status: res.status,
          ok: res.status === 207 || res.status === 200,
          snippet: text.slice(0, 200),
        };
      } catch (e) {
        return {
          url,
          method: "PROPFIND",
          status: 0,
          ok: false,
          snippet: String(e).slice(0, 200),
        };
      }
    })
  );

  const anyOk = results.some((r) => r.ok);

  // Strip sensitive server/user info and raw snippets from the response (MED-6)
  const safeResults = results.map(({ url, method, status, ok }) => ({
    url,
    method,
    status,
    ok,
  }));

  return NextResponse.json({ anyOk, results: safeResults });
}
