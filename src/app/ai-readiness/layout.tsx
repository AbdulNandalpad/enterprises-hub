import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "AI Readiness Analyser — Enterprise Hub",
  description: "Upload your business process documentation and receive a personalised AI readiness report in minutes.",
};

export default function AIReadinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {children}
    </div>
  );
}
