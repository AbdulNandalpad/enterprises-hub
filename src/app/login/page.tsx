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
        style={{ backgroundColor: "#4F6EF7" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tenant.primaryColor)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4F6EF7")}
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

  const accentColor = isDefault ? "#C8341A" : tenant.primaryColor;

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* ── Left — branding panel ─────────────────────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#4F6EF7 0%,#3E5BFF 52%,#7C5CFF 100%)" }}
      >
        {/* Large faded watermark mark — decorative */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 opacity-[0.04]"
          aria-hidden
        >
          <svg width="420" height="420" viewBox="0 0 28 28" fill="none">
            <rect x="2"  y="2"  width="14" height="14" fill="#fff"/>
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
          </svg>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3">
          {isDefault ? (
            <>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <rect x="2"  y="2"  width="14" height="14" fill="#F5F1EA"/>
                <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
                <rect x="12" y="2"  width="2"  height="2"  fill="#0A0906"/>
                <rect x="2"  y="12" width="2"  height="2"  fill="#0A0906"/>
              </svg>
              <span className="font-mono text-sm font-medium tracking-wide text-white/90">
                Enterprise<em className="not-italic" style={{ color: "#C8341A" }}>Hub</em>
              </span>
            </>
          ) : (
            <>
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-7 w-auto object-contain" />
              ) : (
                <span
                  className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold font-mono"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  {tenant.name.charAt(0)}
                </span>
              )}
              <span className="font-mono text-sm font-medium tracking-wide text-white/90">
                {tenant.name.split(" ")[0]}
                <em className="not-italic" style={{ color: tenant.primaryColor }}>{" Hub"}</em>
              </span>
            </>
          )}
        </div>

        {/* Headline + connected-systems chip strip */}
        <div>
          <p
            className="font-mono text-[11px] tracking-widest uppercase mb-5"
            style={{ color: accentColor }}
          >
            {isDefault ? "Private Beta" : "Powered by EnterpriseHub"}
          </p>

          <h1
            className="text-5xl xl:text-6xl font-black leading-[1.05] text-white mb-6"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {isDefault ? (
              <>One login.<br /><span className="text-white/40">All your tools.</span></>
            ) : (
              <>{tenant.name.split(" ")[0]}.<br /><span className="text-white/40">One workspace.</span></>
            )}
          </h1>

          <p className="text-white/45 text-base leading-relaxed max-w-sm mb-10">
            {isDefault
              ? "SAP, Teams, Jira, Salesforce and more — unified under one Azure AD login."
              : `Your ${tenant.name.split(" ")[0]} workspace — every tool in one place, powered by AI.`
            }
          </p>

          {/* Connected systems strip */}
          {isDefault && (
            <div className="flex flex-wrap gap-2">
              {["SAP","Teams","Jira","Salesforce","ServiceNow","SharePoint","Power BI"].map((sys) => (
                <span
                  key={sys}
                  className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 border border-white/10 text-white/30"
                >
                  {sys}
                </span>
              ))}
              <span className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 text-white/20">
                +28 more
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="font-mono text-[10px] text-white/25 tracking-widest uppercase">
          {isDefault ? "enterprises-hub.de" : `${tenant.domain} · powered by enterprises-hub.de`}
        </div>
      </div>

      {/* ── Right — sign-in panel ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F0E8] p-8 lg:p-14">

        {/* Mobile-only logo */}
        <div className="flex items-center gap-3 mb-12 lg:hidden">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect x="2"  y="2"  width="14" height="14" fill="#0A0906"/>
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
          </svg>
          <span className="font-mono text-sm tracking-wide text-[var(--ink)]">
            Enterprise<em className="not-italic text-[#C8341A]">Hub</em>
          </span>
        </div>

        {isDefault ? <DefaultLogin /> : <TenantLogin tenant={tenant} />}
      </div>

    </div>
  );
}
