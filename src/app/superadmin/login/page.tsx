"use client";

/**
 * /superadmin/login — EnterpriseHub internal superadmin login.
 *
 * Protected by SUPERADMIN_SECRET env var (set in Vercel project settings).
 * The middleware redirects all /superadmin/* routes here unless the
 * sa-token cookie matches the secret.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminLogin() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/superadmin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (res.ok) {
        router.replace("/superadmin");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid secret.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0906]">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[11px] tracking-widest uppercase text-[#C8341A] mb-3">
            EnterpriseHub Internal
          </p>
          <h1 className="text-2xl font-black text-white">Superadmin</h1>
          <p className="text-sm text-white/40 mt-1 font-light">
            Enter the superadmin secret to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Superadmin secret"
            autoComplete="current-password"
            className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#C8341A] transition-colors"
          />

          {error && (
            <p className="text-[#C8341A] text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={!secret || loading}
            className="w-full bg-[#C8341A] text-white px-6 py-3 font-mono text-sm tracking-wide hover:bg-[#a82a14] disabled:opacity-40 transition-colors"
          >
            {loading ? "Verifying…" : "Enter"}
          </button>
        </form>

        <p className="mt-8 text-[10px] font-mono text-white/20 text-center">
          Not a public page — internal use only.
        </p>
      </div>
    </div>
  );
}
