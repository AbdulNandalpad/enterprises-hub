"use client";

/**
 * TeamsWidget — shows joined Teams and recent chats via Microsoft Graph.
 * Requires Team.ReadBasic.All + Chat.ReadBasic delegated permissions
 * granted in the Azure AD app registration.
 */

import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { TEAMS_SCOPES } from "@/lib/connectors/teams/scopes";
import { getMyTeams, getRecentChats, type TeamsTeam, type TeamsChat } from "@/lib/connectors/teams/client";

function fmtRelative(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function chatLabel(chat: TeamsChat): string {
  if (chat.topic) return chat.topic;
  if (chat.chatType === "oneOnOne") return "Direct message";
  if (chat.chatType === "meeting")  return "Meeting chat";
  return "Group chat";
}

// ── Teams initial avatar ──────────────────────────────────────────────────────

function TeamAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-lg bg-[#5a3db8] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--shell-border)] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-[var(--shell-border)] animate-pulse w-3/4" />
            <div className="h-2.5 rounded bg-[var(--shell-border)] animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function TeamsWidget() {
  const { instance, accounts } = useMsal();
  const [tab, setTab]         = useState<"teams" | "chats">("teams");
  const [teams, setTeams]     = useState<TeamsTeam[]>([]);
  const [chats, setChats]     = useState<TeamsChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const account = accounts[0];
    if (!account) { setLoading(false); return; }

    let cancelled = false;

    async function fetchTeams() {
      try {
        const res = await instance.acquireTokenSilent({
          scopes: [...TEAMS_SCOPES],
          account,
        });

        const [t, c] = await Promise.all([
          getMyTeams(res.accessToken),
          getRecentChats(res.accessToken),
        ]);

        if (!cancelled) { setTeams(t); setChats(c); }
      } catch (e: unknown) {
        if (!cancelled) {
          // consent_required or interaction_required → scope not yet granted in Azure AD
          const msg = (e as Error).message ?? "";
          if (msg.includes("consent") || msg.includes("interaction")) setBlocked(true);
          else setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTeams();
    return () => { cancelled = true; };
  }, [instance, accounts]);

  if (loading) return <Skeleton />;

  if (blocked) {
    return (
      <div className="p-4 flex flex-col items-center justify-center text-center gap-2">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a3db8]">
          <rect x="1" y="4" width="14" height="10" rx="1.5" />
          <path d="M5 4V3a3 3 0 0 1 6 0v1" />
          <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
        <p className="text-sm font-medium text-[var(--text-primary)]">Teams not connected</p>
        <p className="text-xs text-[var(--text-muted)] max-w-[220px] leading-relaxed">
          Add <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">Team.ReadBasic.All</code> and{" "}
          <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">Chat.ReadBasic</code> in your Azure AD
          app permissions, then sign out and back in.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-[var(--red-status)]">{error}</p>
      </div>
    );
  }

  const items = tab === "teams" ? teams : chats;

  return (
    <div>
      {/* Tab strip */}
      <div className="flex border-b border-[var(--shell-border)] px-3 pt-2">
        {(["teams", "chats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs font-medium px-3 py-1.5 border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-[#5a3db8] text-[#5a3db8]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "teams" ? `Teams (${teams.length})` : `Chats (${chats.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="p-4 text-center text-xs text-[var(--text-muted)]">
          {tab === "teams" ? "Not a member of any teams yet." : "No recent chats."}
        </div>
      ) : (
        <div className="divide-y divide-[var(--shell-border)]">
          {tab === "teams"
            ? (teams as TeamsTeam[]).map((team) => (
                <div key={team.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <TeamAvatar name={team.displayName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{team.displayName}</p>
                    {team.description && (
                      <p className="text-xs text-[var(--text-muted)] truncate">{team.description}</p>
                    )}
                  </div>
                </div>
              ))
            : (chats as TeamsChat[]).map((chat) => (
                <div key={chat.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white ${
                    chat.chatType === "oneOnOne" ? "bg-[var(--active-text)]" :
                    chat.chatType === "meeting"  ? "bg-[var(--green-status)]" : "bg-[#5a3db8]"
                  }`}>
                    {chat.chatType === "oneOnOne" ? "1:1" : chat.chatType === "meeting" ? "M" : "G"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{chatLabel(chat)}</p>
                    {chat.lastUpdatedDateTime && (
                      <p className="text-xs text-[var(--text-muted)]">{fmtRelative(chat.lastUpdatedDateTime)}</p>
                    )}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
