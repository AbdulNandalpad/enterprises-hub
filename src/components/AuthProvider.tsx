"use client";

import { useState, useEffect } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalInstance } from "@/lib/msal";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    const msalInstance = getMsalInstance();
    msalInstance.initialize().then(() => setInstance(msalInstance));
  }, []);

  if (!instance) return null;

  return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
