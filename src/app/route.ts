import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

/** Hostnames that serve the main EnterpriseHub marketing page at /. */
const PRIMARY_HOSTS = [
  "enterprises-hub.de",
  "www.enterprises-hub.de",
];

function isPrimaryHost(hostname: string): boolean {
  const host = hostname.replace(/:\d+$/, "").toLowerCase();
  return (
    PRIMARY_HOSTS.includes(host) ||
    host === "localhost" ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".local")
  );
}

/**
 * Root route handler — serves the EnterpriseHub marketing page for primary
 * domains, but redirects white-label tenant domains straight to /login so
 * they never see the marketing page.
 *
 * The middleware also does this redirect, but Next.js's routing layer can
 * bypass middleware for Route Handlers in some edge cases.  Having the guard
 * here ensures tenant domains are always redirected regardless.
 */
export function GET(request: Request) {
  const { hostname } = new URL(request.url);

  if (!isPrimaryHost(hostname)) {
    // Construct the redirect URL from the parsed components of request.url so
    // we always stay on the correct tenant domain.
    const { protocol } = new URL(request.url);
    return NextResponse.redirect(`${protocol}//${hostname}/login`);
  }

  const html = readFileSync(join(process.cwd(), "index.html"), "utf-8");
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
