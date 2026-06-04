import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "AI Readiness Analyser — Enterprise Hub",
  description: "Upload your business process documentation and receive a personalised AI readiness report in minutes.",
};

export default function AIReadinessLayout({ children }: { children: React.ReactNode }) {
  return (
    // Override text tokens for this light-background flow.
    // --text-secondary #374151 = 8.4:1 on --paper, --text-muted #4B5563 = 6.6:1
    <div
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)]"
      style={
        {
          "--text-secondary": "#374151",
          "--text-muted":     "#4B5563",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
