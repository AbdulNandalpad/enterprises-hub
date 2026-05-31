"use client";

import type { GraphData } from "@/lib/connectors/graph/useGraphData";

export function ProfileWidget({ data }: { data: GraphData }) {
  const { user, loading } = data;

  if (loading) {
    return (
      <div className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--shell-border)] animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-[var(--shell-border)] animate-pulse w-3/4" />
          <div className="h-3 rounded bg-[var(--shell-border)] animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-[var(--text-muted)]">Profile unavailable</p>
      </div>
    );
  }

  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-full bg-[var(--navy)] flex items-center justify-center text-white font-mono font-semibold text-lg flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-base font-semibold text-[var(--text-primary)] truncate">{user.displayName}</p>
        {user.jobTitle && (
          <p className="text-sm text-[var(--text-secondary)] truncate">{user.jobTitle}</p>
        )}
        {user.department && (
          <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{user.department}</p>
        )}
        {user.mail && (
          <p className="text-[11px] text-[var(--text-muted)] truncate">{user.mail}</p>
        )}
      </div>

      {/* SSO badge */}
      <div className="ml-auto flex-shrink-0">
        <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          SSO
        </span>
      </div>
    </div>
  );
}
