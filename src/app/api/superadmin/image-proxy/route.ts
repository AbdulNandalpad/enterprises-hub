/**
 * GET /api/superadmin/image-proxy?url=<encoded-image-url>
 *
 * Proxies an external image for use in the superadmin panel's
 * canvas-based color extraction (avoids CORS restrictions on external images).
 *
 * Protected by superadmin auth (sa-token cookie).
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

function assertSuperadmin(req: NextRequest): NextResponse | null {
  const saToken  = req.cookies.get("sa-token")?.value;
  const saSecret = process.env.SUPERADMIN_SECRET;
  if (!saSecret || saToken !== saSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        // Allow canvas cross-origin reads
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
