import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/gateway/session";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(
    new RegExp(`${SESSION_COOKIE}=([^;]+)`),
  )?.[1];
  const user = token ? await verifySessionToken(token) : null;
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user });
}
