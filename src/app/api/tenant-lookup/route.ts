/**
 * GET /api/tenant-lookup?email=john@company.de
 *
 * Given a work email, finds the onboarded tenant whose hub domain
 * corresponds to that email domain and returns the hub URL to redirect to.
 *
 * Logic: tenant domain is stored as "hub.{emailDomain}" (e.g. hub.servicesphere.de).
 * We strip the "hub." prefix to derive the expected email domain and match.
 *
 * Falls back to the static registry if Supabase is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllTenantsFromDB } from "@/lib/tenant/db";
import { STATIC_TENANTS } from "@/lib/tenant/registry";

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") ?? "").toLowerCase().trim();
  const emailDomain = email.split("@")[1];

  if (!emailDomain || !emailDomain.includes(".")) {
    return NextResponse.json({ found: false, error: "Invalid email" }, { status: 400 });
  }

  // Fetch from Supabase; fall back to static registry if unavailable
  let tenants;
  try {
    tenants = await getAllTenantsFromDB();
  } catch {
    tenants = STATIC_TENANTS;
  }

  // Match: strip "hub." prefix from tenant domain and compare to email domain
  const match = tenants.find((t) => {
    if (t.slug === "default" || !t.active) return false;
    const normalized = t.domain.toLowerCase().replace(/^hub\./, "");
    return normalized === emailDomain;
  });

  if (!match) {
    return NextResponse.json({ found: false });
  }

  const proto = process.env.NODE_ENV === "development" ? "http" : "https";
  return NextResponse.json({
    found: true,
    hubUrl: `${proto}://${match.domain}/login`,
    name: match.name,
    primaryColor: match.primaryColor,
  });
}
