import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Upload your process",
    body:  "Share a PDF, Word doc, PowerPoint, or image of any business process — sales flow, onboarding, reporting, supply chain, anything.",
  },
  {
    n: "02",
    title: "AI analysis in minutes",
    body:  "Our AI reads every step of your process and maps concrete, specific AI opportunities — not generic suggestions.",
  },
  {
    n: "03",
    title: "Report in your inbox",
    body:  "You get a structured report: process breakdown, impact vs effort ratings, top quick wins, and where Enterprise Hub fits.",
  },
];

const EXAMPLES = [
  "Order-to-cash process",
  "Sales qualification workflow",
  "Employee onboarding journey",
  "Customer support escalation",
  "Procurement approval chain",
  "Monthly reporting cycle",
];

export default function AIReadinessLandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Free · No account needed · Report in minutes
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-[var(--ink)] leading-tight mb-6">
          Discover where AI fits<br className="hidden md:block" /> in your business
        </h2>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload any business process document. Our AI identifies every step, maps specific AI opportunities,
          and delivers a personalised readiness report — the same analysis consultants charge €30,000 for.
        </p>
        <Link
          href="/ai-readiness/analyse"
          className="inline-block bg-[#0A0906] text-[#F5F1EA] px-8 py-4 text-sm font-semibold tracking-wide hover:opacity-80 transition-opacity"
        >
          Analyse My Process →
        </Link>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Supported: PDF, Word, PowerPoint, Images · Max 10 MB
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--shell-border)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-10 text-center">
            How it works
          </p>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="font-mono text-3xl font-bold text-[var(--text-muted)] opacity-30">{s.n}</span>
                <h3 className="text-base font-semibold text-[var(--ink)] mt-3 mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-8 text-center">
          Works for any process
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {EXAMPLES.map((ex) => (
            <span
              key={ex}
              className="px-4 py-2 border border-[var(--shell-border)] text-sm text-[var(--text-secondary)] font-mono"
            >
              {ex}
            </span>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-[var(--shell-border)] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-8 text-center">
            What you receive
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Process breakdown",       body: "Every business process in your document, decoded step by step."  },
              { title: "AI opportunity mapping",  body: "Specific AI applications for each process — with impact and effort ratings." },
              { title: "Top quick wins",          body: "The 3-5 highest-value AI initiatives you can realistically start in 30-90 days." },
              { title: "Enterprise Hub fit",      body: "Exactly which Enterprise Hub features map to your specific processes." },
            ].map((item) => (
              <div key={item.title} className="p-5 border border-[var(--shell-border)]">
                <h4 className="text-sm font-semibold text-[var(--ink)] mb-1">{item.title}</h4>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-[var(--shell-border)]">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-4">Start your AI readiness analysis</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Free. Takes 2 minutes to submit. Report delivered to your inbox.
          </p>
          <Link
            href="/ai-readiness/analyse"
            className="inline-block bg-[#0A0906] text-[#F5F1EA] px-8 py-4 text-sm font-semibold tracking-wide hover:opacity-80 transition-opacity"
          >
            Get My Free Report →
          </Link>
        </div>
      </section>

    </main>
  );
}
