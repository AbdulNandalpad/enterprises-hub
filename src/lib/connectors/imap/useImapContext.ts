"use client";

/**
 * useImapContext — React hook providing a `buildContext()` function.
 *
 * Calls /api/connectors/imap/fetch server-side to fetch recent emails.
 * Credentials never touch client state — they live in a httpOnly cookie.
 *
 * Returns a formatted plain-text context string for AI injection, or
 * undefined if IMAP is not configured / unavailable.
 */

import { useCallback } from "react";
import type { ImapMessage } from "./types";

export function useImapContext() {
  const buildContext = useCallback(async (): Promise<string | undefined> => {
    try {
      const res = await fetch("/api/connectors/imap/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  }, []);

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
