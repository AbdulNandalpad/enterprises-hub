"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const [passcode, setPasscode]   = useState("");
  const [error,    setError]      = useState("");
  const [loading,  setLoading]    = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/demo/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError("Incorrect passcode.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "linear-gradient(160deg,#1C1A18 0%,#0A0906 100%)" }}
    >
      <div className="w-full max-w-xs">

        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-16">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2"  y="2"  width="14" height="14" fill="#F5F1EA"/>
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
            <rect x="12" y="2"  width="2"  height="2"  fill="#0A0906"/>
            <rect x="2"  y="12" width="2"  height="2"  fill="#0A0906"/>
          </svg>
          <span className="font-mono text-xs tracking-widest uppercase text-white/50">
            enterprises·hub
          </span>
        </div>

        {/* Label */}
        <p className="font-mono text-[11px] tracking-widest uppercase text-[#C8341A] mb-3">
          Internal Demo
        </p>
        <h1 className="text-3xl font-bold text-white mb-10 leading-tight">
          Enter<br />passcode
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••••••"
            autoFocus
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/15"
          />

          {error && (
            <p className="font-mono text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C8341A] text-white font-mono text-sm tracking-widest uppercase hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {loading ? "Checking…" : "Enter →"}
          </button>
        </form>

        <p className="mt-10 font-mono text-[10px] text-white/20 text-center">
          For internal use only · enterprises-hub.de
        </p>
      </div>
    </main>
  );
}
