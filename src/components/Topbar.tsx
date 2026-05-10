"use client";

import { useMsal } from "@azure/msal-react";

export default function Topbar() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 bg-[var(--shell-surface)] border-b border-[var(--shell-border)]">
      <a href="/dashboard" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide text-[var(--text-primary)]">
        Enterprise<em className="not-italic text-[var(--brand-red)]">Hub</em>
      </a>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          SSO Active
        </span>
        {account && (
          <span className="text-sm text-[var(--text-secondary)]">{account.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center font-mono text-xs text-white font-semibold hover:bg-[var(--brand-red)] transition-colors"
          title="Sign out"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
