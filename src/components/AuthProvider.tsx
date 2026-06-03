/**
 * AuthProvider — Server Component
 *
 * Reads the `x-is-public` request header that the Edge Middleware stamps on
 * every response for /ai-readiness paths (and all requests on the
 * ai-readiness subdomain).  Passes the resulting boolean down to the client
 * AuthProviderClient, which uses it to decide whether to initialise MSAL.
 *
 * Keeping this decision server-side means MSAL is *never* imported or run on
 * public pages, regardless of client-side pathname state.
 */

import { headers } from "next/headers";
import AuthProviderClient from "./AuthProviderClient";

export default async function AuthProvider({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const isPublic = headersList.get("x-is-public") === "1";

  return <AuthProviderClient isPublic={isPublic}>{children}</AuthProviderClient>;
}
