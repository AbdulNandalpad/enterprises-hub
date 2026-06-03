"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalInstance } from "@/lib/msal";
import { RolesProvider } from "@/contexts/RolesContext";

/**
 * Routes that are fully public — no Azure AD authentication needed.
 * MSAL and RolesProvider are skipped entirely on these paths so that
 * public subdomains (e.g. ai-readiness.enterprises-hub.de) don't
 * trigger an Azure AD redirect.
 */
const PUBLIC_PREFIXES = ["/ai-readiness"];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const isPublic  = PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p));

  const [instance, setInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    if (isPublic) return; // skip MSAL entirely on public routes
    const msalInstance = getMsalInstance();
    msalInstance.initialize().then(() => setInstance(msalInstance));
  }, [isPublic]);

  // Public routes — render with no auth wrapper at all
  if (isPublic) return <>{children}</>;

  // Authenticated routes — wait for MSAL, then mount MsalProvider + RolesProvider
  if (!instance) return null;

  return (
    <MsalProvider instance={instance}>
      <RolesProvider>{children}</RolesProvider>
    </MsalProvider>
  );
}
