"use client";

import { useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/msal";

export default function Home() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

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
      {/* Left — branding */}
      <div
        className="flex flex-col justify-between p-12 lg:p-20"
        style={{ background: "linear-gradient(160deg, #1C1A18 0%, #0A0906 100%)" }}
      >
        <div className="font-mono text-sm font-medium tracking-wide text-[var(--paper)]">
          Enterprise<em className="not-italic text-[var(--red)]">Hub</em>
        </div>

        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--red)] mb-6">
            Private Beta
          </p>
          <h1
            className="text-5xl lg:text-6xl font-black leading-tight text-[var(--paper)] mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            One workspace.<br />
            <em className="italic opacity-50">All your tools.</em>
          </h1>
          <p className="text-[var(--ink4)] font-light text-lg leading-relaxed max-w-md">
            SAP, Teams, Jira, Salesforce and more — unified under one login. No tab chaos. No context switching.
          </p>
        </div>

        <div className="font-mono text-[11px] text-[var(--ink4)] tracking-wide">
          enterprises-hub.de
        </div>
      </div>

      {/* Right — login */}
      <div className="flex flex-col items-center justify-center bg-[var(--paper)] p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-[var(--ink)] mb-2">Sign in</h2>
          <p className="text-sm text-[var(--ink4)] font-light mb-10">
            Use your organisation Microsoft account to access your workspace.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center gap-4 bg-[var(--ink)] text-[var(--paper)] px-6 py-4 font-mono text-sm tracking-wide hover:bg-[var(--red)] transition-colors"
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
            By signing in you agree to your organisation&apos;s IT policies. EnterpriseHub does not store your credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
