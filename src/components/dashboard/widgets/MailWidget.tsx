"use client";

/**
 * MailWidget — shows recent Outlook/Microsoft 365 emails via Microsoft Graph.
 * Requires Mail.ReadBasic delegated permission granted in the Azure AD app registration.
 */

import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { GRAPH_MAIL_SCOPES } from "@/lib/connectors/graph/scopes";
import { getRecentMail, getUnreadCount, type GraphMessage } from "@/lib/connectors/graph/client";
import { useDemoMode } from "@/lib/demo/useDemoMode";
import { DEMO_MAIL } from "@/lib/demo/fixtures";

function fmtRelative(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(iso).toLocaleDateString("en-DE", { day: "numeric", month: "short" });
}

function senderInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Skeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--shell-border)] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-3 rounded bg-[var(--shell-border)] animate-pulse w-2/3" />
            <div className="h-2.5 rounded bg-[var(--shell-border)] animate-pulse w-full" />
          </div>
          <div className="w-8 h-2.5 rounded bg-[var(--shell-border)] animate-pulse flex-shrink-0 mt-1" />
        </div>
      ))}
    </div>
  );
}

export function MailWidget() {
  const isDemoMode = useDemoMode();
  const { instance, accounts } = useMsal();
  const [messages, setMessages] = useState<GraphMessage[]>([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [blocked, setBlocked]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Demo mode: populate from fixtures
  useEffect(() => {
    if (!isDemoMode) return;
    setMessages(DEMO_MAIL as GraphMessage[]);
    setUnread(DEMO_MAIL.filter((m) => !m.isRead).length);
    setLoading(false);
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    const account = accounts[0];
    if (!account) { setLoading(false); return; }

    let cancelled = false;

    async function fetchMail() {
      try {
        const res = await instance.acquireTokenSilent({
          scopes: [...GRAPH_MAIL_SCOPES],
          account,
        });

        const [msgs, count] = await Promise.all([
          getRecentMail(res.accessToken, 8),
          getUnreadCount(res.accessToken),
        ]);

        if (!cancelled) { setMessages(msgs); setUnread(count); }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = (e as Error).message ?? "";
          if (msg.includes("consent") || msg.includes("interaction")) setBlocked(true);
          else setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMail();
    return () => { cancelled = true; };
  }, [instance, accounts]);

  if (loading) return <Skeleton />;

  if (blocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center text-center gap-2">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--active-text)]">
          <rect x="1" y="3" width="14" height="10" rx="1.5" />
          <path d="M1 5l7 5 7-5" />
        </svg>
        <p className="text-sm font-medium text-[var(--text-primary)]">Mail not connected</p>
        <p className="text-xs text-[var(--text-muted)] max-w-[220px] leading-relaxed">
          Add <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">Mail.ReadBasic</code> in your
          Azure AD app permissions, then sign out and back in.
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-xs text-[var(--red-status)]">{error}</div>;
  }

  return (
    <div>
      {/* Header with unread count */}
      {unread > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--shell-border)] bg-[var(--active-bg)]">
          <span className="text-xs font-medium text-[var(--active-text)]">{unread} unread</span>
          <a
            href="https://outlook.office.com/mail/inbox"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[var(--active-text)] hover:underline"
          >
            Open Outlook ↗
          </a>
        </div>
      )}

      {/* Message list */}
      {messages.length === 0 ? (
        <div className="p-4 text-center text-xs text-[var(--text-muted)]">No recent messages.</div>
      ) : (
        <div className="divide-y divide-[var(--shell-border)]">
          {messages.map((msg) => (
            <a
              key={msg.id}
              href={msg.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors block ${
                !msg.isRead ? "bg-[var(--active-bg)]" : ""
              }`}
            >
              {/* Sender avatar */}
              <div className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {senderInitials(msg.from.emailAddress.name)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm truncate ${!msg.isRead ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                    {msg.from.emailAddress.name}
                  </span>
                  {!msg.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--active-text)] flex-shrink-0 inline-block" />
                  )}
                </div>
                <p className={`text-xs truncate ${!msg.isRead ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"}`}>
                  {msg.subject || "(no subject)"}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{msg.bodyPreview}</p>
              </div>

              {/* Time */}
              <span className="text-[10px] font-mono text-[var(--text-muted)] flex-shrink-0 mt-0.5">
                {fmtRelative(msg.receivedDateTime)}
              </span>
            </a>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--shell-border)]">
          <a
            href="https://outlook.office.com/mail"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--active-text)] transition-colors"
          >
            Open full inbox ↗
          </a>
        </div>
      )}
    </div>
  );
}
