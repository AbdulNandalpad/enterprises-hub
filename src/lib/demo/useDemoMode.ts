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

export function useDemoMode(): boolean {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setIsDemoMode(
      document.cookie.split(";").some((c) => c.trim().startsWith("eh-demo="))
    );
  }, []);

  return isDemoMode;
}
