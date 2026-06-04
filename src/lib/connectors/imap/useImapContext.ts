"use client";

/**
 * useImapContext — React hook providing a `buildContext()` function.
 *
 * Calls /api/connectors/imap/fetch server-side with the current user's
 * MSAL email so each user sees only their own mailbox.
 *
 * Returns a formatted plain-text context string for AI injection, or
 * undefined if IMAP is not configured / unavailable.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import type { ImapMessage } from "./types";

export function useImapContext() {
  const { instance, accounts } = useMsal();

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    try {
      // Acquire a fresh ID token so the server can verify our identity
      let idToken: string | null = null;
      const account = accounts[0];
      if (account) {
        try {
          const result = await instance.acquireTokenSilent({
            scopes:  ["openid", "profile"],
            account,
          });
          idToken = result.idToken ?? null;
        } catch {
          // Fallback: use the cached raw token claim if silent refresh fails
          idToken = (account.idTokenClaims as Record<string, unknown>)?.__raw as string ?? null;
        }
      }

      const res = await fetch("/api/connectors/imap/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!res.ok) return undefined;

      const data = await res.json() as { messages?: ImapMessage[] };
      const messages = data.messages;
      if (!messages || messages.length === 0) return undefined;

      return formatImapContext(messages);
    } catch {
      return undefined;
    }
  }, [instance, accounts]);

  return { buildContext };
}

function formatImapContext(messages: ImapMessage[]): string {
  const lines: string[] = [`[Email Inbox — ${messages.length} recent messages]`];

  for (const msg of messages) {
    const date = new Date(msg.date).toLocaleDateString(undefined, {
      month: "short", day: "numeric",
    });
    lines.push(`  • ${date}  From: ${msg.from}`);
    lines.push(`    Subject: ${msg.subject}`);
    if (msg.snippet) {
      lines.push(`    Preview: ${msg.snippet.slice(0, 120)}…`);
    }
  }

  return lines.join("\n");
}
