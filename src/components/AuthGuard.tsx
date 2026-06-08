"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, instance, accounts } = useMsal();
  const router = useRouter();

  // Three-state: null = still checking, true = valid demo, false = not demo mode
  const [isDemoMode, setIsDemoMode] = useState<boolean | null>(null);

  // Guard: only establish the server session once per mount
  const sessionEstablishedRef = useRef(false);

  // ── Demo-mode check ───────────────────────────────────────────────────────

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

  // ── Redirect unauthenticated users ────────────────────────────────────────

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

  // ── Establish server-side session after MSAL auth ─────────────────────────
  //
  // Once MSAL reports a valid account we exchange the Azure ID token for an
  // httpOnly `eh-session` cookie.  This is a one-shot operation per mount —
  // the cookie carries an 8-hour JWT so we don't repeat it on every render.

  useEffect(() => {
    if (!isAuthenticated || inProgress !== "none") return;
    if (sessionEstablishedRef.current) return;
    if (!accounts[0]) return;

    sessionEstablishedRef.current = true; // prevent duplicate calls

    (async () => {
      try {
        const result = await instance.acquireTokenSilent({
          account: accounts[0],
          scopes: ["openid", "profile", "email"],
        });

        const idToken = result.idToken;
        if (!idToken) return;

        await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        // Response sets the httpOnly `eh-session` cookie automatically.
        // We don't need the body — errors here are non-fatal; assertAdmin
        // degrades gracefully when SESSION_SECRET is absent.
      } catch {
        // Token acquisition failure (network glitch, consent needed, etc.)
        // is non-fatal — the user is still authenticated via MSAL client-side.
        sessionEstablishedRef.current = false; // allow retry on next render
      }
    })();
  }, [isAuthenticated, inProgress, instance, accounts]);

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
