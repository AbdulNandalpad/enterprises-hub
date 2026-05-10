"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && inProgress === "none") {
      router.replace("/login");
    }
  }, [isAuthenticated, inProgress, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <p className="font-mono text-sm text-[var(--ink4)] tracking-widest uppercase animate-pulse">
          Checking session…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
