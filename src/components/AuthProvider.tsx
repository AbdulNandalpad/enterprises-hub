"use client";

import { MsalProvider } from "@azure/msal-react";
import { getMsalInstance } from "@/lib/msal";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const instance = getMsalInstance();
  return <MsalProvider instance={instance}>{children}</MsalProvider>;
}
