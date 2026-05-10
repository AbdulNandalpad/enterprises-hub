"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { loginRequest } from "@/lib/msal";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();

  useEffect(() => {
    if (!isAuthenticated && inProgress === "none") {
      instance.loginRedirect(loginRequest);
    }
  }, [isAuthenticated, inProgress, instance]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <div className="text-center">
          <p className="font-mono text-sm text-[var(--ink4)] tracking-widest uppercase">
            Redirecting to login…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
