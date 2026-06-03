"use client";

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INDUSTRIES = [
  "Manufacturing",
  "Retail & E-commerce",
  "Financial Services",
  "Healthcare",
  "Logistics & Supply Chain",
  "Professional Services",
  "Technology & Software",
  "Construction & Real Estate",
  "Energy & Utilities",
  "Education",
  "Other",
];

const ACCEPTED = ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp";

export default function AnalysePage() {
  const router    = useRef(useRouter());
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:        "",
    email:       "",
    company:     "",
    industry:    "",
    role:        "",
    description: "",
  });
  const [file,    setFile]    = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("File too large — max 10 MB"); return; }
    setFile(f);
    setError("");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please upload a file"); return; }

    setSubmitting(true);
    setError("");

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
    data.append("file", file);

    try {
      const res = await fetch("/api/ai-readiness/submit", { method: "POST", body: data });

      // Safely parse JSON — Vercel may return an HTML error page on timeout/crash
      let json: { ok?: boolean; error?: string } = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        // Non-JSON response = Vercel timeout or infrastructure error
        const text = await res.text().catch(() => "");
        throw new Error(
          res.status === 504 || text.toLowerCase().includes("timeout")
            ? "The analysis timed out. Try a smaller or simpler document."
            : `Server error (${res.status}). Please try again.`
        );
      }

      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      router.current.push(`/ai-readiness/done?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm border border-[var(--shell-border)] bg-white text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] transition-colors";

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">

      {/* Back */}
      <Link
        href="/ai-readiness"
        className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--ink)] transition-colors mb-8 inline-block"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">Analyse your business process</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-10 leading-relaxed">
        Fill in your details, upload your process document, and your personalised AI Readiness Report
        will arrive in your inbox within minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Registration */}
        <fieldset>
          <legend className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-4">Your details</legend>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Full name *</label>
              <input type="text" required value={form.name} onChange={set("name")}
                placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Work email *</label>
              <input type="email" required value={form.email} onChange={set("email")}
                placeholder="jane@company.com" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company *</label>
              <input type="text" required value={form.company} onChange={set("company")}
                placeholder="Acme GmbH" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Industry</label>
              <select value={form.industry} onChange={set("industry")} className={inputCls}>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Your role</label>
            <input type="text" value={form.role} onChange={set("role")}
              placeholder="e.g. Head of Operations, CTO, Process Manager" className={inputCls} />
          </div>
        </fieldset>

        {/* File upload */}
        <fieldset>
          <legend className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-4">Process document *</legend>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-[var(--ink)] bg-[var(--ink)]/5"
                : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-[var(--shell-border)] hover:border-[var(--ink)]"
            }`}
          >
            {file ? (
              <div>
                <p className="text-2xl mb-2">📄</p>
                <p className="text-sm font-semibold text-[var(--ink)]">{file.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {(file.size / 1024).toFixed(0)} KB · Click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-2">⬆</p>
                <p className="text-sm font-semibold text-[var(--ink)]">Drop your file here or click to browse</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PDF, Word, PowerPoint, or image · Max 10 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="sr-only"
          />
        </fieldset>

        {/* Optional context */}
        <fieldset>
          <legend className="font-mono text-[11px] tracking-widest uppercase text-[var(--text-muted)] mb-4">
            Additional context <span className="normal-case font-normal">(optional)</span>
          </legend>
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={3}
            placeholder="Any context that would help the analysis — e.g. 'We're a mid-size logistics company trying to reduce manual data entry in our order processing workflow'"
            className={`${inputCls} resize-none`}
          />
        </fieldset>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[var(--ink)] text-[var(--paper)] text-sm font-semibold tracking-wide hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {submitting ? "Analysing your document…" : "Generate My AI Report →"}
        </button>

        {submitting && (
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)] animate-pulse">
              Claude is reading your document and mapping AI opportunities — this takes 15-30 seconds…
            </p>
          </div>
        )}

        <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
          By submitting you agree to receive your report and occasional updates from Enterprise Hub.
          Your document is analysed once and never stored. We may follow up about the findings.
        </p>
      </form>
    </main>
  );
}
