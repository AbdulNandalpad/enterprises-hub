"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/msal";
import { useTenant } from "@/contexts/TenantContext";

// ── Tenant-domain login (hub.company.de/login) ────────────────────────────────
// Shows the Microsoft SSO button directly — tenant is already known from hostname.

function TenantLogin({ tenant }: { tenant: ReturnType<typeof useTenant> }) {
  const { instance } = useMsal();

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-black text-[var(--ink)] mb-2">
        Sign in to {tenant.name.split(" ")[0]}
      </h2>
      <p className="text-sm text-[var(--ink4)] font-light mb-10">
        Use your organisation Microsoft account to access your workspace.
      </p>

      <button
        onClick={() => instance.loginRedirect(loginRequest)}
        className="w-full flex items-center gap-4 text-[var(--paper)] px-6 py-4 font-mono text-sm tracking-wide transition-colors"
        style={{ backgroundColor: "#0A0906" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tenant.primaryColor)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0A0906")}
      >
        <MicrosoftLogo />
        Sign in with Microsoft
      </button>

      <p className="mt-8 text-[11px] font-mono text-[var(--ink4)] leading-relaxed">
        By signing in you agree to your organisation&apos;s IT policies.{" "}
        {tenant.name} does not store your credentials.
      </p>
    </div>
  );
}

// ── Default-domain login (www.enterprises-hub.de/login) ───────────────────────
// Email-first: extract domain → look up tenant → redirect to hub.company.de/login

type LookupState = "idle" | "loading" | "not_found" | "error";

function DefaultLogin() {
  const [email, setEmail]       = useState("");
  const [state, setState]       = useState<LookupState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res  = await fetch(`/api/tenant-lookup?email=${encodeURIComponent(trimmed)}`);
      const json = await res.json() as { found: boolean; hubUrl?: string; error?: string };

      if (json.found && json.hubUrl) {
        window.location.href = json.hubUrl;
        return; // redirect in progress — stay in loading state
      }

      setState("not_found");
    } catch {
      setState("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-sm">
      {state !== "not_found" ? (
        <>
          <h2 className="text-2xl font-black text-[var(--ink)] mb-2">Welcome back</h2>
          <p className="text-sm text-[var(--ink4)] font-light mb-10">
            Enter your work email and we&apos;ll route you to your company&apos;s hub.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[var(--ink4)] mb-2 tracking-widest uppercase">
                Work email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.de"
                disabled={state === "loading"}
                className="w-full px-4 py-3 text-sm border border-[var(--shell-border,#D4CDBE)] bg-white text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors font-mono disabled:opacity-50"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-mono">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={state === "loading"}
              className="w-full py-3 bg-[var(--ink,#0A0906)] text-white font-mono text-sm tracking-wide transition-opacity disabled:opacity-50 hover:opacity-80"
            >
              {state === "loading" ? "Checking…" : "Continue →"}
            </button>
          </form>

          <p className="mt-8 text-[11px] font-mono text-[var(--ink4)] leading-relaxed">
            Only onboarded companies can sign in. Not onboarded yet?{" "}
            <a href="/#cta" className="underline hover:text-[var(--ink)]">
              Request access
            </a>
            .
          </p>
        </>
      ) : (
        /* Not found state */
        <div>
          <div className="text-3xl mb-4">—</div>
          <h2 className="text-2xl font-black text-[var(--ink)] mb-3">
            Not onboarded yet
          </h2>
          <p className="text-sm text-[var(--ink4)] font-light mb-8 leading-relaxed">
            We don&apos;t have a hub set up for{" "}
            <span className="font-mono text-[var(--ink)]">
              {email.split("@")[1]}
            </span>{" "}
            yet. Request early access and we&apos;ll be in touch.
          </p>

          <a
            href="/#cta"
            className="inline-block w-full py-3 bg-[#C8341A] text-white font-mono text-sm tracking-wide text-center hover:opacity-80 transition-opacity"
          >
            Request Early Access →
          </a>

          <button
            onClick={() => { setState("idle"); setEmail(""); }}
            className="mt-4 w-full py-2 text-xs font-mono text-[var(--ink4)] hover:text-[var(--ink)] transition-colors"
          >
            ← Try a different email
          </button>
        </div>
      )}
    </div>
  );
}

// ── Microsoft logo mark ────────────────────────────────────────────────────────
function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const tenant = useTenant();

  const isDefault = tenant.slug === "default";

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  // Suppress unused warning — instance is used in TenantLogin
  void instance;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left — branding panel */}
      <div
        className="flex flex-col justify-between p-12 lg:p-20"
        style={{ background: "linear-gradient(160deg, #1C1A18 0%, #0A0906 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 font-mono text-sm font-medium tracking-wide text-white/90">
          {isDefault ? (
            <>
              Enterprise<em className="not-italic" style={{ color: "#C8341A" }}>Hub</em>
            </>
          ) : (
            <>
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="w-6 h-6 object-contain" />
              ) : (
                <span
                  className="w-5 h-5 flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  {tenant.name.charAt(0)}
                </span>
              )}
              <span>
                {tenant.name.split(" ")[0]}
                <em className="not-italic" style={{ color: tenant.primaryColor }}>{" Hub"}</em>
              </span>
            </>
          )}
        </div>

        {/* Headline */}
        <div>
          <p
            className="font-mono text-[11px] tracking-widest uppercase mb-6"
            style={{ color: isDefault ? "#C8341A" : tenant.primaryColor }}
          >
            {isDefault ? "Private Beta" : "Powered by EnterpriseHub"}
          </p>
          <h1
            className="text-5xl lg:text-6xl font-black leading-tight text-white mb-6"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {isDefault ? (
              <>One workspace.<br /><em className="italic text-white/50">All your tools.</em></>
            ) : (
              <>{tenant.name.split(" ")[0]}.<br /><em className="italic text-white/50">One workspace.</em></>
            )}
          </h1>
          <p className="text-white/50 font-light text-lg leading-relaxed max-w-md">
            {isDefault
              ? "SAP, Teams, Jira, Salesforce and more — unified under one login. No tab chaos. No context switching."
              : `Your ${tenant.name.split(" ")[0]} workspace — all your tools in one place, powered by AI.`
            }
          </p>
        </div>

        {/* Footer */}
        <div className="font-mono text-[11px] text-white/30 tracking-wide">
          {isDefault ? "enterprises-hub.de" : `${tenant.domain} · powered by enterprises-hub.de`}
        </div>
      </div>

      {/* Right — sign-in panel */}
      <div className="flex flex-col items-center justify-center bg-[#F5F0E8] p-12">
        {isDefault ? <DefaultLogin /> : <TenantLogin tenant={tenant} />}
      </div>

    </div>
  );
}
