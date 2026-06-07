/**
 * GET /api/superadmin/image-proxy?url=<encoded-image-url>
 *
 * Proxies an external image for use in the superadmin panel's
 * canvas-based color extraction (avoids CORS restrictions on external images).
 *
 * Security:
 *  - Protected by superadmin auth (sa-token cookie)
 *  - SSRF protection: blocks private/loopback IP ranges and known metadata hosts
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assertSuperadmin } from "@/lib/superadmin-auth";
import { blockSsrfTarget } from "@/lib/api-security";

export async function GET(req: NextRequest) {
  const authErr = assertSuperadmin(req);
  if (authErr) return authErr;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
  }

  // SSRF protection — block private/internal hosts (HIGH-1)
  if (blockSsrfTarget(url)) {
    return NextResponse.json({ error: "Target host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "EnterpriseHub-ImageProxy/1.0" },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/") && !contentType.startsWith("application/octet-stream")) {
      return NextResponse.json({ error: "URL does not point to an image" }, { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();

    // Scope CORS to the same origin — this endpoint is only called from the
    // superadmin panel, never from third-party pages.
    const origin = req.headers.get("origin");
    const host   = req.headers.get("host");
    const allowedOrigin =
      origin && host && (origin === `https://${host}` || origin === `http://${host}`)
        ? origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? "");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":                contentType,
        "Cache-Control":               "private, max-age=3600",
        "Access-Control-Allow-Origin": allowedOrigin,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
