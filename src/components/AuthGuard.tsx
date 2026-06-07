"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();
  const router = useRouter();

  // Three-state: null = still checking, true = valid demo, false = not demo mode
  const [isDemoMode, setIsDemoMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Fast path: if the cookie isn't present at all, skip the network call.
    const hasDemoCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("eh-demo="));

    if (!hasDemoCookie) {
      setIsDemoMode(false);
      return;
    }

    // Cookie is present — verify the HMAC server-side so a forged cookie
    // (manually set via DevTools) can't bypass authentication.
    fetch("/api/demo/verify")
      .then((r) => r.json())
      .then((data: { valid: boolean }) => setIsDemoMode(data.valid === true))
      .catch(() => setIsDemoMode(false));
  }, []);

  useEffect(() => {
    // Wait until demo-mode check is complete
    if (isDemoMode === null) return;
    // Valid demo session — no Microsoft account needed
    if (isDemoMode) return;
    // Normal users: redirect to login if MSAL is idle and no session
    if (!isAuthenticated && inProgress === "none") {
      router.replace("/login");
    }
  }, [isAuthenticated, inProgress, router, isDemoMode]);

  // Still determining demo mode — render nothing to avoid flash
  if (isDemoMode === null) return null;

  // Valid demo session — pass straight through
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
