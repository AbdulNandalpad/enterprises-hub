import Link from "next/link";

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="max-w-lg mx-auto px-6 py-24 text-center">

      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-[var(--ink)] mb-3">Your report is on its way</h1>

      {email ? (
        <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
          We&apos;ve sent your personalised AI Readiness Report to{" "}
          <span className="font-semibold text-[var(--ink)]">{email}</span>.
        </p>
      ) : (
        <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
          Your personalised AI Readiness Report is on its way to your inbox.
        </p>
      )}

      <p className="text-sm text-[var(--text-secondary)] mb-10 leading-relaxed">
        Check your spam folder if it doesn&apos;t arrive within 5 minutes.
      </p>

      <div className="border border-[var(--shell-border)] p-6 mb-8 text-left">
        <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-3">Your report includes</p>
        <ul className="space-y-2">
          {[
            "Every business process identified in your document",
            "Specific AI opportunities — with impact & effort ratings",
            "Top quick wins you can implement in 30–90 days",
            "Where Enterprise Hub fits your specific processes",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <a
          href="https://enterprises-hub.de"
          className="block w-full py-3 bg-[var(--ink)] text-[var(--paper)] text-sm font-semibold tracking-wide text-center hover:opacity-80 transition-opacity"
        >
          Explore Enterprise Hub →
        </a>
        <Link
          href="/ai-readiness/analyse"
          className="block w-full py-3 border border-[var(--shell-border)] text-sm text-[var(--text-secondary)] text-center hover:bg-[var(--shell-border)] transition-colors"
        >
          Analyse another process
        </Link>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mt-10">
        Questions? Contact us at{" "}
        <a href="mailto:hello@enterprises-hub.de" className="underline hover:text-[var(--ink)] transition-colors">
          hello@enterprises-hub.de
        </a>
      </p>
    </main>
  );
}
