/**
 * /api/user/keys
 *
 * Manages AI provider API keys.  Keys are stored in httpOnly cookies
 * (Path=/api) so they are NEVER accessible to client-side JavaScript.
 *
 * POST  { provider, key }              — save key for a provider
 * GET   ?provider=openai               — check if a key is configured (no value returned)
 * DELETE { provider }                  — remove key for a provider
 */

import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  buildKeyCookie,
  buildClearKeyCookie,
  readApiKey,
  isValidProvider,
  isPlausibleApiKey,
} from "@/lib/api-security";

const isProd = process.env.NODE_ENV === "production";

// ── POST — save a key ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // CSRF check
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, key } = body as Record<string, unknown>;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!isPlausibleApiKey(key)) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, configured: true });
  res.headers.set(
    "Set-Cookie",
    buildKeyCookie(provider, key as string, isProd)
  );
  return res;
}

// ── GET — check if a key is configured (returns boolean only, never the key) ──
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const key = await readApiKey(provider);
  return NextResponse.json({ configured: key !== null });
}

// ── DELETE — remove a key ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider } = body as Record<string, unknown>;
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, configured: false });
  res.headers.set("Set-Cookie", buildClearKeyCookie(provider));
  return res;
}
