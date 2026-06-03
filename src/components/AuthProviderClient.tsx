"use client";

/**
 * AuthProviderClient
 *
 * Receives the `isPublic` flag from the parent Server Component (AuthProvider).
 * That flag is computed server-side from the `x-is-public` request header that
 * the Edge Middleware stamps on every /ai-readiness response.
 *
 * When isPublic is true:
 *   - MSAL is never initialised
 *   - MsalProvider and RolesProvider are never mounted
 *   - Children render immediately, with no Azure AD involvement
 *
 * When isPublic is false (all authenticated routes):
 *   - MSAL is initialised once on mount
 *   - Children are wrapped with MsalProvider + RolesProvider as usual
 */

import { useState, useEffect } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalInstance } from "@/lib/msal";
import { RolesProvider } from "@/contexts/RolesContext";

interface Props {
  children: React.ReactNode;
  isPublic: boolean;
}

export default function AuthProviderClient({ children, isPublic }: Props) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    if (isPublic) return; // never touch MSAL on public routes
    const msalInstance = getMsalInstance();
    msalInstance.initialize().then(() => setInstance(msalInstance));
  }, [isPublic]);

  // Public route — render children with no auth wrapper at all
  if (isPublic) return <>{children}</>;

  // Authenticated route — wait for MSAL, then mount providers
  if (!instance) return null;

  return (
    <MsalProvider instance={instance}>
      <RolesProvider>{children}</RolesProvider>
    </MsalProvider>
  );
}
