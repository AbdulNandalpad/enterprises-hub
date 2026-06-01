/**
 * /api/tenant
 *
 * Returns the resolved TenantConfig for the current request.
 * The middleware has already set the `eh-tenant` cookie — this route
 * reads it and returns the full config object to the client.
 *
 * GET → { slug, name, brandName, primaryColor, ... }
 */

import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, getTenantByDomain } from "@/lib/tenant/registry";

export async function GET(req: NextRequest) {
  // Prefer the cookie set by middleware (most reliable)
  const slug = req.cookies.get("eh-tenant")?.value;
  let tenant = slug ? getTenantBySlug(slug) : undefined;

  // Fallback: resolve from host header directly
  if (!tenant) {
    const host = req.headers.get("host") ?? "";
    tenant = getTenantByDomain(host);
  }

  // Never expose internal notes to the client
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes: _notes, ...safeConfig } = tenant!;

  return NextResponse.json(safeConfig);
}
