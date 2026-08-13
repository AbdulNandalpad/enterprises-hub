/**
 * Server-verified sessions (security rules 1 & 4): short-lived HS256 JWT in
 * an httpOnly cookie, signed with SESSION_SECRET. No client-side trust.
 */
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/core/env";
import type { SessionUser } from "@/core/types";

export const SESSION_COOKIE = "eh-session";
const SESSION_HOURS = 8;

function secret(): Uint8Array {
  const s = requireEnv("SESSION_SECRET");
  if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const { sub, name, email, tenantSlug, role } = payload as Record<string, unknown>;
    if (
      typeof sub !== "string" || typeof name !== "string" ||
      typeof email !== "string" || typeof tenantSlug !== "string" ||
      (role !== "member" && role !== "company_admin")
    ) return null;
    return { sub, name, email, tenantSlug, role };
  } catch {
    return null;
  }
}

export function sessionCookieAttributes(): string {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`;
}
