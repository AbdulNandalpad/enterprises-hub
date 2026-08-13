import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildSignInUrl } from "@/identity/azure";
import { checkRateLimit } from "@/gateway/rate-limit";
import { EnvMissingError } from "@/core/env";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const state = randomBytes(16).toString("hex");
    const url = await buildSignInUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("eh-oauth-state", state, {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
    });
    return res;
  } catch (err) {
    if (err instanceof EnvMissingError) {
      console.error("login: missing env", err.variable);
      return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });
    }
    console.error("login: failed", err);
    return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
  }
}
