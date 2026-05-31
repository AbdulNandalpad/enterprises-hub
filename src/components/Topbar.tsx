"use client";

import { useMsal } from "@azure/msal-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggleSimple } from "./ThemeToggle";
import { useUIPrefs } from "@/contexts/UIPrefsContext";

export default function Topbar() {
  const { instance, accounts } = useMsal();
  const pathname = usePathname();
  const { getLabel } = useUIPrefs();
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
      {/* Logo */}
      <a
        href="/dashboard"
        className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide text-[var(--text-primary)]"
      >
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="14" height="14" fill="currentColor" className="text-[var(--text-primary)]"/>
          <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
          <rect x="12" y="2" width="2" height="2" fill="var(--shell-surface)"/>
          <rect x="2" y="12" width="2" height="2" fill="var(--shell-surface)"/>
        </svg>
        Enterprise<em className="not-italic text-[var(--brand-red)]">Hub</em>
      </a>

      {/* Right controls */}
      <div className="flex items-center gap-2">

        {/* User / Admin mode toggle */}
        <div className="flex items-center border border-[var(--shell-border)] rounded-full p-0.5 bg-[var(--shell-bg)]">
          <Link
            href="/dashboard"
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
              !isAdmin
                ? "bg-[var(--navy)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {getLabel("User")}
          </Link>
          <Link
            href="/dashboard/admin"
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${
              isAdmin
                ? "bg-[var(--admin)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {getLabel("Admin")}
          </Link>
        </div>

        {/* SSO badge */}
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          SSO Active
        </span>

        {/* Theme toggle */}
        <ThemeToggleSimple />

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          title="Settings"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          aria-label="Settings"
        >
          ⚙
        </Link>

        {/* User name */}
        {account && (
          <span className="text-sm text-[var(--text-secondary)] hidden sm:block">
            {account.name}
          </span>
        )}

        {/* Avatar / sign-out */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-full bg-[var(--navy)] flex items-center justify-center font-mono text-xs text-white font-semibold hover:bg-[var(--brand-red)] transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
