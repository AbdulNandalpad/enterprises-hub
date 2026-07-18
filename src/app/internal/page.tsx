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
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 50% 0%, #EEF1FE 0%, transparent 60%), #F5F6F9",
      }}
    >
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect x="2"  y="2"  width="14" height="14" fill="#4F6EF7"/>
            <rect x="12" y="12" width="14" height="14" fill="#E85D9A"/>
            <rect x="12" y="2"  width="2"  height="2"  fill="#0B0B12"/>
            <rect x="2"  y="12" width="2"  height="2"  fill="#0B0B12"/>
          </svg>
          <span className="font-mono text-xs tracking-widest uppercase" style={{ color: "#8A8A99" }}>
            enterprises·hub
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex mb-8 border-b" style={{ borderColor: "#E5E7EF" }}>
          {(["demo", "superadmin"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 pb-2.5 font-mono text-[11px] tracking-widest uppercase transition-colors"
              style={
                mode === m
                  ? { color: "#0B0B12", borderBottom: "2px solid #4F6EF7", marginBottom: "-1px" }
                  : { color: "#8A8A99" }
              }
            >
              {m === "demo" ? "Demo" : "Superadmin"}
            </button>
          ))}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#0B0B12" }}>
          {mode === "demo" ? "Enter passcode" : "Enter secret"}
        </h1>
        <p className="font-mono text-[11px] mb-8" style={{ color: "#8A8A99" }}>
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
            className="w-full px-4 py-3 font-mono text-sm rounded-lg focus:outline-none transition-colors"
            style={{ background: "#FFFFFF", border: "1px solid #E5E7EF", color: "#0B0B12" }}
          />

          {error && (
            <p className="font-mono text-xs" style={{ color: "#DC2626" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !secret}
            className="w-full py-3 text-white font-mono text-sm tracking-widest uppercase rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: "#4F6EF7" }}
          >
            {loading ? "Checking…" : "Enter →"}
          </button>
        </form>

        <p className="mt-10 font-mono text-[10px] text-center" style={{ color: "#B4B4C0" }}>
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
