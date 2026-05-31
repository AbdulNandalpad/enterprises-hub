"use client";

/**
 * /auth/redirect — dedicated MSAL popup redirect handler.
 *
 * MSAL v5 requires the popup redirect URI to be a page that explicitly
 * calls handleRedirectPromise(). This page does exactly that and nothing
 * else — it renders no UI and closes itself after MSAL finishes.
 *
 * You MUST register this URL in Azure AD:
 *   Azure Portal → App registrations → your app → Authentication
 *   → Add URI → https://enterprises-hub.de/auth/redirect
 *   (also add http://localhost:3001/auth/redirect for local dev)
 */

import { useEffect } from "react";
import { getMsalInstance } from "@/lib/msal";

export default function AuthRedirectPage() {
  useEffect(() => {
    const msalInstance = getMsalInstance();
    msalInstance
      .initialize()
      .then(() => msalInstance.handleRedirectPromise())
      .catch(() => {
        // Auth error — still close the popup so it doesn't hang
      })
      .finally(() => {
        // MSAL closes the popup after postMessage to the opener,
        // but call window.close() as a fallback just in case.
        if (typeof window !== "undefined" && window.opener) {
          window.close();
        }
      });
  }, []);

  // Render nothing — this page is never seen by the user
  return null;
}
