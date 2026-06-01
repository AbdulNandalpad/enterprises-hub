"use client";

import { useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/msal";
import { useTenant } from "@/contexts/TenantContext";

export default function LoginPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const tenant = useTenant();

  const isDefault = tenant.slug === "default";

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left — branding panel */}
      <div
        className="flex flex-col justify-between p-12 lg:p-20"
        style={{ background: "linear-gradient(160deg, #1C1A18 0%, #0A0906 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 font-mono text-sm font-medium tracking-wide text-[var(--paper)]">
          {isDefault ? (
            <>
              Enterprise<em className="not-italic" style={{ color: tenant.primaryColor }}>Hub</em>
            </>
          ) : (
            <>
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="w-6 h-6 object-contain" />
              ) : (
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
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
          {!isDefault && (
            <p
              className="font-mono text-[11px] tracking-widest uppercase mb-6"
              style={{ color: tenant.primaryColor }}
            >
              Powered by EnterpriseHub
            </p>
          )}
          {isDefault && (
            <p className="font-mono text-[11px] tracking-widest uppercase mb-6" style={{ color: tenant.primaryColor }}>
              Private Beta
            </p>
          )}
          <h1
            className="text-5xl lg:text-6xl font-black leading-tight text-[var(--paper)] mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {isDefault ? (
              <>One workspace.<br /><em className="italic opacity-50">All your tools.</em></>
            ) : (
              <>{tenant.name.split(" ")[0]}.<br /><em className="italic opacity-50">One workspace.</em></>
            )}
          </h1>
          <p className="text-[var(--ink4)] font-light text-lg leading-relaxed max-w-md">
            {isDefault
              ? "SAP, Teams, Jira, Salesforce and more — unified under one login. No tab chaos. No context switching."
              : `Your ${tenant.name.split(" ")[0]} workspace — all your tools in one place, powered by AI.`
            }
          </p>
        </div>

        {/* Footer */}
        <div className="font-mono text-[11px] text-[var(--ink4)] tracking-wide">
          {isDefault ? "enterprises-hub.de" : `${tenant.domain} · powered by enterprises-hub.de`}
        </div>
      </div>

      {/* Right — sign-in panel */}
      <div className="flex flex-col items-center justify-center bg-[var(--paper)] p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-[var(--ink)] mb-2">
            Sign in{!isDefault ? ` to ${tenant.name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-[var(--ink4)] font-light mb-10">
            Use your organisation Microsoft account to access your workspace.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center gap-4 text-[var(--paper)] px-6 py-4 font-mono text-sm tracking-wide transition-colors"
            style={{ backgroundColor: "#0A0906" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tenant.primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0A0906")}
          >
            {/* Microsoft logo */}
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>

          <p className="mt-8 text-[11px] font-mono text-[var(--ink4)] leading-relaxed">
            By signing in you agree to your organisation&apos;s IT policies.
            {isDefault ? " EnterpriseHub" : ` ${tenant.name}`} does not store your credentials.
          </p>
        </div>
      </div>

    </div>
  );
}
