import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "AI Readiness Analyser — EnterpriseHub",
  description: "Upload your business process documentation and receive a personalised AI readiness report in minutes.",
};

export default function AIReadinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">

      {/* Branded nav — shared across all ai-readiness pages */}
      <header className="border-b border-[var(--shell-border)] bg-white sticky top-0 z-10">
        <div className="px-6 flex items-center justify-between max-w-6xl mx-auto h-14">
          <a href="https://enterprises-hub.de" className="flex items-center gap-2.5 no-underline">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="14" height="14" fill="#0A0906"/>
              <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
              <rect x="12" y="2" width="2" height="2" fill="#F5F1EA"/>
              <rect x="2" y="12" width="2" height="2" fill="#F5F1EA"/>
            </svg>
            <span className="font-mono text-[12px] font-medium tracking-wide text-[#0A0906]">
              enterprises<span className="text-[#C8341A]">·hub</span>
            </span>
          </a>
          <div className="flex items-center gap-5">
            <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--text-muted)] hidden sm:block">
              AI Readiness Analyser
            </span>
            <a
              href="https://enterprises-hub.de/login"
              className="font-mono text-[10px] tracking-wider uppercase text-white bg-[#0A0906] px-4 py-2 hover:opacity-80 transition-opacity no-underline"
            >
              Sign In →
            </a>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-[var(--shell-border)] px-6 py-6 text-center">
        <p className="font-mono text-[11px] text-[var(--text-muted)]">
          © {new Date().getFullYear()} EnterpriseHub ·{" "}
          <a href="https://enterprises-hub.de" className="hover:text-[var(--ink)] transition-colors">
            enterprises-hub.de
          </a>
        </p>
      </footer>

    </div>
  );
}
