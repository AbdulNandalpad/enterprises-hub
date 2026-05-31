"use client";

import { useState, useRef, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUIPrefs } from "@/contexts/UIPrefsContext";
import { IconGear, IconSignOut, IconChevronDownSmall } from "@/components/icons";

export default function Topbar() {
  const { instance, accounts } = useMsal();
  const pathname = usePathname();
  const { getLabel } = useUIPrefs();
  const account = accounts[0];

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = account?.name
    ? account.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const isAdmin = pathname.startsWith("/dashboard/admin");

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          title="Settings"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          aria-label="Settings"
        >
          <IconGear size={14} />
        </Link>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          {/* Avatar trigger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border border-[var(--shell-border)] bg-[var(--shell-bg)] hover:bg-[var(--hover-bg)] transition-colors"
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            <span className="w-7 h-7 rounded-full bg-[var(--navy)] flex items-center justify-center font-mono text-xs text-white font-semibold">
              {initials}
            </span>
            <IconChevronDownSmall
              size={12}
              className={`text-[var(--text-muted)] transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden z-50">

              {/* User info */}
              <div className="px-4 py-3 border-b border-[var(--shell-border)]">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[var(--navy)] flex items-center justify-center font-mono text-sm text-white font-semibold flex-shrink-0">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {account?.name ?? "Unknown user"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {account?.username ?? ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <IconGear size={14} />
                  Settings
                </Link>
              </div>

              <div className="border-t border-[var(--shell-border)] py-1">
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--red-status)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <IconSignOut size={14} />
                  Sign out
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
