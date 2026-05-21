"use client";

import { useMsal } from "@azure/msal-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Topbar() {
  const { instance, accounts } = useMsal();
  const pathname = usePathname();
  const account = accounts[0];
  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const isAdmin = pathname.startsWith("/dashboard/admin");

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 bg-[var(--shell-surface)] border-b border-[var(--shell-border)]">
      <a href="/dashboard" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide text-[var(--text-primary)]">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="14" height="14" fill="#0F172A"/>
          <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
          <rect x="12" y="2" width="2" height="2" fill="#F5F1EA"/>
          <rect x="2" y="12" width="2" height="2" fill="#F5F1EA"/>
        </svg>
        Enterprise<em className="not-italic text-[var(--brand-red)]">Hub</em>
      </a>

      <div className="flex items-center gap-3">
        {/* Mode toggle */}
        <div className="flex items-center border border-[var(--shell-border)] rounded-full p-0.5 bg-[var(--shell-bg)]">
          <Link
            href="/dashboard"
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
              !isAdmin
                ? "bg-[var(--navy)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            User
          </Link>
          <Link
            href="/dashboard/admin"
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
              isAdmin
                ? "bg-[var(--admin)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Admin
          </Link>
        </div>

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
