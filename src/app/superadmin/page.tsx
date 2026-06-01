"use client";

/**
 * /superadmin — EnterpriseHub internal client management panel.
 *
 * Shows all provisioned tenants from the registry.
 * Protected by middleware — only accessible with the sa-token cookie.
 *
 * To add a new client: fill the "Provision" form → copy the generated
 * config snippet → paste into src/lib/tenant/registry.ts → deploy.
 * (Full self-serve DB provisioning via Supabase is a future milestone.)
 */

import { useState } from "react";
import { TENANTS } from "@/lib/tenant/registry";
import type { TenantConfig } from "@/lib/tenant/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: TenantConfig["plan"] }) {
  const styles: Record<TenantConfig["plan"], string> = {
    trial:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pro:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${styles[plan]}`}>
      {plan}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${active ? "text-emerald-600" : "text-[var(--text-muted)]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Provision form ───────────────────────────────────────────────────────────

function ProvisionForm() {
  const [form, setForm] = useState({
    slug: "",
    name: "",
    brandName: "",
    primaryColor: "#C8341A",
    domain: "",
    azureTenantId: "",
    plan: "trial" as TenantConfig["plan"],
    notes: "",
  });
  const [snippet, setSnippet] = useState("");

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setSnippet(""); // reset on change
  }

  function generate() {
    const today = new Date().toISOString().split("T")[0];
    const config = {
      slug: form.slug,
      name: form.name,
      brandName: form.brandName || `${form.name} Hub`,
      primaryColor: form.primaryColor,
      domain: form.domain,
      ...(form.azureTenantId ? { azureTenantId: form.azureTenantId } : {}),
      plan: form.plan,
      active: true,
      createdAt: today,
      ...(form.notes ? { notes: form.notes } : {}),
    };
    setSnippet(JSON.stringify(config, null, 2));
  }

  const inputCls = "w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--navy)] placeholder:text-[var(--text-muted)]";

  return (
    <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Provision New Client</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Fill the form → generate config snippet → paste into{" "}
          <code className="font-mono text-[0.75rem] bg-[var(--shell-bg)] px-1 rounded">src/lib/tenant/registry.ts</code>{" "}
          → deploy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Slug <span className="text-[var(--red-status)]">*</span></label>
          <input className={inputCls} placeholder="acme-gmbh" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Company name <span className="text-[var(--red-status)]">*</span></label>
          <input className={inputCls} placeholder="Acme GmbH" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Brand name (in hub)</label>
          <input className={inputCls} placeholder="Acme Hub" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Domain <span className="text-[var(--red-status)]">*</span></label>
          <input className={inputCls} placeholder="hub.acme.de  or  acme.enterprises-hub.de" value={form.domain} onChange={(e) => set("domain", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Primary colour</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="w-9 h-9 rounded cursor-pointer border border-[var(--shell-border)]" />
            <input className={`${inputCls} flex-1`} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Azure Tenant ID <span className="text-[var(--text-muted)]">(optional)</span></label>
          <input className={inputCls} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.azureTenantId} onChange={(e) => set("azureTenantId", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Plan</label>
          <select className={inputCls} value={form.plan} onChange={(e) => set("plan", e.target.value)}>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Notes (internal)</label>
          <input className={inputCls} placeholder="Key contact, use case, etc." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!form.slug || !form.name || !form.domain}
        className="px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-hover)] disabled:opacity-40 transition-colors"
      >
        Generate config snippet
      </button>

      {snippet && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Copy this into the <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">TENANTS</code> array in{" "}
            <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">src/lib/tenant/registry.ts</code>, then deploy:
          </p>
          <pre className="bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-xl p-4 text-xs font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre">
            {snippet}
          </pre>
          <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold">DNS setup for client</p>
            <p>Option A (custom domain): Ask client to add CNAME <code className="font-mono">{form.domain}</code> → <code className="font-mono">enterprises-hub.vercel.app</code>, then add the domain in Vercel → Project → Domains.</p>
            <p>Option B (EH subdomain): Use <code className="font-mono">{form.slug}.enterprises-hub.de</code> — no client DNS action needed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperadminPage() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/superadmin/auth", { method: "DELETE" }).catch(() => {});
    document.cookie = "sa-token=; path=/superadmin; max-age=0";
    window.location.href = "/superadmin/login";
  }

  const tenants = TENANTS.filter((t) => t.slug !== "default");
  const activeTenants = tenants.filter((t) => t.active);
  const trialTenants = tenants.filter((t) => t.plan === "trial");

  return (
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--text-primary)]">
      {/* Top bar */}
      <header className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="14" height="14" fill="currentColor" className="text-[var(--text-primary)]"/>
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
            <rect x="12" y="2" width="2" height="2" fill="var(--shell-surface)"/>
            <rect x="2" y="12" width="2" height="2" fill="var(--shell-surface)"/>
          </svg>
          <div>
            <p className="font-mono text-xs font-semibold text-[var(--text-primary)]">Enterprise<em className="not-italic text-[#C8341A]">Hub</em></p>
            <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Superadmin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors"
        >
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total clients",  value: tenants.length },
            { label: "Active",         value: activeTenants.length },
            { label: "On trial",       value: trialTenants.length },
            { label: "Connectors",     value: "IMAP · Teams · Graph" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl px-4 py-4">
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tenant list */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Clients</h2>
          <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
              {["Company", "Domain", "Plan", "Status", "Since"].map((h) => (
                <p key={h} className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">{h}</p>
              ))}
            </div>

            {tenants.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                No clients provisioned yet. Use the form below to add the first one.
              </div>
            ) : (
              tenants.map((t, i) => (
                <div
                  key={t.slug}
                  className={`grid grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center ${
                    i < tenants.length - 1 ? "border-b border-[var(--shell-border)]" : ""
                  }`}
                >
                  {/* Company */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: t.primaryColor }}
                    >
                      {t.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.name}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)]">{t.slug}</p>
                    </div>
                  </div>

                  {/* Domain */}
                  <p className="font-mono text-xs text-[var(--text-secondary)] truncate">{t.domain}</p>

                  {/* Plan */}
                  <div><PlanBadge plan={t.plan} /></div>

                  {/* Status */}
                  <div><StatusDot active={t.active} /></div>

                  {/* Since */}
                  <p className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes column (if any tenant has notes) */}
        {tenants.some((t) => t.notes) && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Notes</h2>
            <div className="space-y-2">
              {tenants.filter((t) => t.notes).map((t) => (
                <div key={t.slug} className="flex gap-3 text-xs bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg px-4 py-3">
                  <span className="font-semibold text-[var(--text-primary)] whitespace-nowrap">{t.name}</span>
                  <span className="text-[var(--text-muted)]">{t.notes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provision form */}
        <ProvisionForm />

        <p className="text-[10px] font-mono text-[var(--text-muted)] text-center pb-4">
          enterprises-hub.de · Superadmin · Internal use only
        </p>
      </main>
    </div>
  );
}
