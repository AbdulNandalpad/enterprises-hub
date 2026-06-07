/**
 * useDemoMode — client-side hook.
 *
 * Returns true if the current session is a valid demo session.
 * AuthGuard has already validated the HMAC before reaching any dashboard
 * page, so checking cookie existence here is sufficient for UI branching.
 * (Server-side calls that need strict validation use verifyDemoToken.)
 */

"use client";

import { useState, useEffect } from "react";

function hasDemoCookie(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("eh-demo="));
}

export function useDemoMode(): boolean {
  // Initialise synchronously so the value is correct on the very first render.
  // This prevents child components from firing API calls before the effect runs
  // and flips the flag (race condition → 403 errors in demo mode).
  const [isDemoMode, setIsDemoMode] = useState(hasDemoCookie);

  useEffect(() => {
    setIsDemoMode(hasDemoCookie());
  }, []);

  return isDemoMode;
}
