"use client";

/**
 * /internal — unified internal access page.
 *
 * Replaces the two separate /demo and /superadmin/login pages.
 * One URL to remember. Two modes selected by a tab:
 *
 *   Demo       — passcode → POST /api/demo/auth       → /dashboard
 *   Superadmin — secret   → POST /api/superadmin/auth → /superadmin
 *
 * ?mode=superadmin pre-selects the Superadmin tab (used by the middleware
 * redirect when an unauthenticated request hits /superadmin/*).
 */

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Mode = "demo" | "superadmin";

function InternalLogin() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [mode,    setMode]    = useState<Mode>(
    searchParams.get("mode") === "superadmin" ? "superadmin" : "demo"
  );
  const [secret,  setSecret]  = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Clear input and error when switching tabs
  useEffect(() => { setSecret(""); setError(""); }, [mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "demo" ? "/api/demo/auth" : "/api/superadmin/auth";
      const body     = mode === "demo"
        ? JSON.stringify({ passcode: secret })
        : JSON.stringify({ secret });

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        router.replace(mode === "demo" ? "/dashboard" : "/superadmin");
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 429) {
          setError("Too many attempts. Try again in 15 minutes.");
        } else {
          // Generic message — don't reveal which mode failed
          setError(data.error ?? "Invalid credentials.");
        }
        setLoading(false);
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "linear-gradient(160deg,#1C1A18 0%,#0A0906 100%)" }}>
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect x="2"  y="2"  width="14" height="14" fill="#F5F1EA"/>
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
            <rect x="12" y="2"  width="2"  height="2"  fill="#0A0906"/>
            <rect x="2"  y="12" width="2"  height="2"  fill="#0A0906"/>
          </svg>
          <span className="font-mono text-xs tracking-widest uppercase text-white/40">
            enterprises·hub
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-8 border-b border-white/10">
          {(["demo", "superadmin"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 pb-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                mode === m
                  ? "text-white border-b-2 border-[#C8341A] -mb-px"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {m === "demo" ? "Demo" : "Superadmin"}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-1">
          {mode === "demo" ? "Enter passcode" : "Enter secret"}
        </h1>
        <p className="font-mono text-[11px] text-white/30 mb-8">
          {mode === "demo"
            ? "Sales demo access — opens the dashboard"
            : "Internal use only — opens tenant management"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            key={mode}
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="••••••••"
            autoFocus
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/15"
          />

          {error && (
            <p className="font-mono text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full py-3 bg-[#C8341A] text-white font-mono text-sm tracking-widest uppercase hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {loading ? "Checking…" : "Enter →"}
          </button>
        </form>

        <p className="mt-10 font-mono text-[10px] text-white/15 text-center">
          Not a public page · enterprises-hub.de
        </p>
      </div>
    </div>
  );
}

export default function InternalPage() {
  return (
    <Suspense>
      <InternalLogin />
    </Suspense>
  );
}
