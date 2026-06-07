"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const router = useRouter();

  // Check demo cookie before making any auth decisions.
  // Must be client-side (document.cookie) — cookie is non-httpOnly by design.
  const [isDemoMode, setIsDemoMode] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDemoMode(document.cookie.includes("eh-demo=1"));
  }, []);

  useEffect(() => {
    // Wait until we know whether we're in demo mode
    if (isDemoMode === null) return;
    // Demo users are always allowed through — no Microsoft account needed
    if (isDemoMode) return;
    // Normal users: redirect to login if MSAL is idle and no session
    if (!isAuthenticated && inProgress === "none") {
      router.replace("/login");
    }
  }, [isAuthenticated, inProgress, router, isDemoMode]);

  // Still determining demo mode — render nothing to avoid flash
  if (isDemoMode === null) return null;

  // Demo mode — pass straight through
  if (isDemoMode) return <>{children}</>;

  // Authenticated — pass through
  if (isAuthenticated) return <>{children}</>;

  // Not authenticated yet — show holding screen while MSAL resolves
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
      <p className="font-mono text-sm text-[var(--ink4)] tracking-widest uppercase animate-pulse">
        Checking session…
      </p>
    </div>
  );
}
