"use client";

/**
 * /superadmin — EnterpriseHub internal client management panel.
 *
 * Fully database-driven. All changes save instantly to Supabase —
 * no code deploys needed to add or modify tenants.
 *
 * Protected by middleware (sa-token cookie must match SUPERADMIN_SECRET).
 */

import { useState, useEffect, useRef, type FormEvent } from "react";
import type { TenantConfig } from "@/lib/tenant/types";
import AdminPlaybook from "@/components/admin/AdminPlaybook";

// ─── Color extraction helper (canvas-based) ───────────────────────────────────

async function extractColorsFromLogo(logoUrl: string): Promise<string[]> {
  const proxyUrl = `/api/superadmin/image-proxy?url=${encodeURIComponent(logoUrl)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const SIZE = 80;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve([]); return; }
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

      const buckets: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 4 * 4) { // sample every 4th pixel
        const a = data[i + 3];
        if (a < 128) continue; // skip transparent
        const r = Math.round(data[i]     / 40) * 40;
        const g = Math.round(data[i + 1] / 40) * 40;
        const b = Math.round(data[i + 2] / 40) * 40;
        // Skip near-white, near-black, and near-grey
        if (r > 220 && g > 220 && b > 220) continue;
        if (r < 35  && g < 35  && b < 35)  continue;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat < 30) continue; // skip desaturated greys
        const key = `${r},${g},${b}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      const sorted = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k]) => {
          const [r, g, b] = k.split(",").map(Number);
          return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        });

      resolve(sorted);
    };
    img.onerror = () => resolve([]);
    img.src = proxyUrl;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: TenantConfig["plan"] }) {
  const styles: Record<string, string> = {
    trial:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    pro:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${styles[plan] ?? ""}`}>
      {plan}
    </span>
  );
}

const inputCls = "w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--navy)] placeholder:text-[var(--text-muted)]";

// ─── Add tenant form ──────────────────────────────────────────────────────────

function AddTenantForm({ onAdded }: { onAdded: (t: TenantConfig) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    slug: "", name: "", brandName: "", primaryColor: "#C8341A",
    logoUrl: "", domain: "", azureTenantId: "", plan: "trial" as TenantConfig["plan"], notes: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          brandName: form.brandName || `${form.name} Hub`,
          logoUrl: form.logoUrl || undefined,
          azureTenantId: form.azureTenantId || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json() as { tenant?: TenantConfig; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onAdded(data.tenant!);
      setOpen(false);
      setForm({ slug:"", name:"", brandName:"", primaryColor:"#C8341A", logoUrl:"", domain:"", azureTenantId:"", plan:"trial", notes:"" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-hover)] transition-colors"
      >
        + Add tenant
      </button>
    );
  }

  return (
    <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add New Tenant</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Slug <span className="text-red-500">*</span></label>
            <input className={inputCls} placeholder="acme-gmbh" value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required />
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Lowercase, letters, numbers, hyphens only</p>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Company name <span className="text-red-500">*</span></label>
            <input className={inputCls} placeholder="Acme GmbH" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Brand name <span className="text-[var(--text-muted)]">(in hub)</span></label>
            <input className={inputCls} placeholder={form.name ? `${form.name} Hub` : "Acme Hub"} value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Domain <span className="text-red-500">*</span></label>
            <input className={inputCls} placeholder="hub.acme.de" value={form.domain} onChange={(e) => set("domain", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Primary colour</label>
            <div className="flex gap-2">
              <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="w-10 h-9 rounded border border-[var(--shell-border)] cursor-pointer flex-shrink-0" />
              <input className={`${inputCls} flex-1`} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Logo URL <span className="text-[var(--text-muted)]">(optional — shown in topbar & login)</span></label>
            <input className={inputCls} placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Azure Tenant ID <span className="text-[var(--text-muted)]">(optional — locks login to this company)</span></label>
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
            <label className="block text-xs text-[var(--text-muted)] mb-1">Notes (internal only)</label>
            <input className={inputCls} placeholder="Key contact, use case…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* DNS instructions preview */}
        {form.slug && form.domain && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold">DNS setup (share with client after saving)</p>
            <p>Ask client to add: <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">CNAME {form.domain} → enterprises-hub.vercel.app</code></p>
            <p>Then add domain in Vercel → Project → Domains.</p>
            <p className="text-amber-600">Or use EH subdomain: <code className="font-mono">{form.slug}.enterprises-hub.de</code> (no client DNS needed)</p>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving || !form.slug || !form.name || !form.domain}
            className="px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-hover)] disabled:opacity-40 transition-colors">
            {saving ? "Saving…" : "Save tenant"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 border border-[var(--shell-border)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function EditTenantDrawer({ tenant, onSaved, onClose }: {
  tenant: TenantConfig;
  onSaved: (t: TenantConfig) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:          tenant.name,
    brandName:     tenant.brandName,
    primaryColor:  tenant.primaryColor,
    logoUrl:       tenant.logoUrl       ?? "",
    domain:        tenant.domain,
    azureTenantId: tenant.azureTenantId ?? "",
    plan:          tenant.plan,
    active:        tenant.active,
    notes:         tenant.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExtractColors() {
    if (!form.logoUrl) return;
    setExtracting(true);
    setExtractedColors([]);
    const colors = await extractColorsFromLogo(form.logoUrl);
    setExtractedColors(colors);
    setExtracting(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(""); setExtractedColors([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", tenant.slug);
      const res = await fetch("/api/superadmin/upload-logo", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set("logoUrl", data.url!);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function set(k: string, v: string | boolean) { setForm((f) => ({ ...f, [k]: v })); setError(""); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: tenant.slug, ...form, logoUrl: form.logoUrl || undefined, azureTenantId: form.azureTenantId || undefined, notes: form.notes || undefined }),
      });
      const data = await res.json() as { tenant?: TenantConfig; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onSaved(data.tenant!);
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/tenants?slug=${tenant.slug}`, { method: "DELETE" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onClose();
      // Signal parent to remove this tenant
      onSaved({ ...tenant, active: false, slug: `__deleted__${tenant.slug}` });
    } catch (err) { setError((err as Error).message); setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 dark:bg-black/50" onClick={onClose} />
      {/* Drawer */}
      <aside className="w-full max-w-md bg-[var(--shell-surface)] border-l border-[var(--shell-border)] flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--shell-border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit {tenant.name}</h2>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">{tenant.slug}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="flex-1 p-6 space-y-4">
          {[
            { label: "Company name", key: "name", placeholder: "Acme GmbH" },
            { label: "Brand name (in hub)", key: "brandName", placeholder: "Acme Hub" },
            { label: "Domain", key: "domain", placeholder: "hub.acme.de" },
            { label: "Azure Tenant ID (optional)", key: "azureTenantId", placeholder: "xxxxxxxx-…" },
            { label: "Notes (internal)", key: "notes", placeholder: "Key contact, use case…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{label}</label>
              <input className={inputCls} placeholder={placeholder}
                value={String(form[key as keyof typeof form])}
                onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}

          {/* Logo upload + color extraction */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Logo</label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Upload button row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 border border-[var(--shell-border)] text-xs rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {uploading ? "Uploading…" : "⬆ Upload file"}
              </button>
              <input
                className={`${inputCls} flex-1`}
                placeholder="or paste a URL"
                value={form.logoUrl}
                onChange={(e) => { set("logoUrl", e.target.value); setExtractedColors([]); }}
              />
            </div>

            {uploadError && <p className="text-[10px] text-red-500 mt-1">{uploadError}</p>}

            {/* Logo preview + Extract button */}
            {form.logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="w-10 h-10 object-contain border border-[var(--shell-border)] rounded bg-white p-1 flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{form.logoUrl}</p>
                </div>
                <button
                  type="button"
                  onClick={handleExtractColors}
                  disabled={extracting}
                  title="Extract dominant colours from logo"
                  className="px-2 py-1.5 border border-[var(--shell-border)] text-[10px] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {extracting ? "…" : "🎨 Extract colors"}
                </button>
              </div>
            )}

            {/* Extracted colour swatches */}
            {extractedColors.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-[var(--text-muted)] mb-1.5">Click a colour to use as primary:</p>
                <div className="flex gap-2 flex-wrap">
                  {extractedColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("primaryColor", c)}
                      title={c}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        form.primaryColor === c
                          ? "border-[var(--navy)] scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Primary colour</label>
            <div className="flex gap-2">
              <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="w-10 h-9 rounded border border-[var(--shell-border)] cursor-pointer flex-shrink-0" />
              <input className={`${inputCls} flex-1`} value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Plan</label>
            <select className={inputCls} value={form.plan} onChange={(e) => set("plan", e.target.value)}>
              <option value="trial">Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="accent-[var(--navy)]" />
            <span className="text-sm text-[var(--text-secondary)]">Active (unchecking suspends the tenant)</span>
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-[var(--navy)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--navy-hover)] disabled:opacity-40 transition-colors">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-[var(--shell-border)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
              Cancel
            </button>
          </div>
        </form>

        {/* Danger zone */}
        {tenant.slug !== "default" && (
          <div className="px-6 pb-6">
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-900 space-y-2">
              <p className="text-xs font-semibold text-red-600">Danger zone</p>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-500 hover:text-red-700 underline">
                  Delete this tenant permanently
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600">This permanently removes <strong>{tenant.name}</strong> from the database. Are you sure?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 border border-[var(--shell-border)] text-xs rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperadminPage() {
  const [tenants, setTenants]   = useState<TenantConfig[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [editing, setEditing]   = useState<TenantConfig | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"clients" | "playbook">("clients");

  useEffect(() => {
    fetch("/api/superadmin/tenants")
      .then((r) => r.json())
      .then((d: { tenants?: TenantConfig[]; error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setTenants(d.tenants ?? []);
      })
      .catch(() => setError("Could not load tenants."))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    // Server clears the sa-token cookie (set with path="/") — the client call is sufficient.
    await fetch("/api/superadmin/auth", { method: "DELETE" }).catch(() => {});
    window.location.href = "/internal";
  }

  function handleAdded(t: TenantConfig) {
    setTenants((prev) => [...prev, t]);
  }

  function handleSaved(t: TenantConfig) {
    if (t.slug.startsWith("__deleted__")) {
      const originalSlug = t.slug.replace("__deleted__", "");
      setTenants((prev) => prev.filter((x) => x.slug !== originalSlug));
    } else {
      setTenants((prev) => prev.map((x) => x.slug === t.slug ? t : x));
    }
    setEditing(null);
  }

  const clients    = tenants.filter((t) => t.slug !== "default");
  const active     = clients.filter((t) => t.active);
  const trials     = clients.filter((t) => t.plan === "trial");

  return (
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--text-primary)]">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="14" height="14" fill="currentColor" />
            <rect x="12" y="12" width="14" height="14" fill="#C8341A"/>
            <rect x="12" y="2" width="2" height="2" fill="var(--shell-surface)"/>
            <rect x="2" y="12" width="2" height="2" fill="var(--shell-surface)"/>
          </svg>
          <div>
            <p className="font-mono text-xs font-semibold">Enterprise<em className="not-italic text-[#C8341A]">Hub</em></p>
            <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Superadmin</p>
          </div>
        </div>
        <button onClick={handleLogout} disabled={loggingOut}
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-red-500 transition-colors">
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-6 flex gap-1">
        {(["clients", "playbook"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-[#C8341A] text-[#C8341A]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab === "clients" ? "Clients" : "Product Intelligence"}
          </button>
        ))}
      </div>

      {/* ── Playbook tab ───────────────────────────────────────────────────────── */}
      {activeTab === "playbook" && (
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          <AdminPlaybook apiEndpoint="/api/ai/superadmin-expert" />
        </main>
      )}

      {/* ── Clients tab ───────────────────────────────────────────────────────── */}
      {activeTab === "clients" && (
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total clients",  value: loading ? "…" : clients.length },
            { label: "Active",         value: loading ? "…" : active.length },
            { label: "On trial",       value: loading ? "…" : trials.length },
            { label: "DB",             value: "Supabase" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl px-4 py-4">
              <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-1">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-sm text-red-600">
            {error.includes("Missing NEXT_PUBLIC_SUPABASE") || error.includes("Could not load") ? (
              <div className="space-y-2">
                <p className="font-semibold">Supabase not configured yet</p>
                <p className="text-xs">Add <code className="font-mono bg-red-100 dark:bg-red-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="font-mono bg-red-100 dark:bg-red-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code className="font-mono bg-red-100 dark:bg-red-900 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your Vercel environment variables, then run the DB migration.</p>
              </div>
            ) : error}
          </div>
        )}

        {/* Tenant table + Add button */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Clients</h2>
            {!loading && !error && <AddTenantForm onAdded={handleAdded} />}
          </div>

          <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_1fr_1fr_80px_40px] gap-4 px-5 py-2.5 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
              {["Company", "Domain", "Plan", "Status", "Since", ""].map((h) => (
                <p key={h} className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">{h}</p>
              ))}
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">Loading…</div>
            ) : clients.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
                {error ? "Could not load — check env vars." : "No clients yet. Add the first one above."}
              </div>
            ) : (
              clients.map((t, i) => (
                <div
                  key={t.slug}
                  className={`flex flex-col sm:grid sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_80px_40px] gap-2 sm:gap-4 px-5 py-3.5 items-start sm:items-center ${
                    i < clients.length - 1 ? "border-b border-[var(--shell-border)]" : ""
                  } ${!t.active ? "opacity-50" : ""}`}
                >
                  {/* Company */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: t.primaryColor }}>
                      {t.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)]">{t.slug}</p>
                    </div>
                  </div>
                  {/* Domain */}
                  <p className="font-mono text-xs text-[var(--text-secondary)] truncate">{t.domain}</p>
                  {/* Plan */}
                  <div><PlanBadge plan={t.plan} /></div>
                  {/* Status */}
                  <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${t.active ? "text-emerald-600" : "text-[var(--text-muted)]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.active ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {t.active ? "Active" : "Suspended"}
                  </span>
                  {/* Since */}
                  <p className="font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </p>
                  {/* Edit */}
                  <button onClick={() => setEditing(t)}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors">
                    Edit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Setup guide */}
        <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold">Setup Guide</h2>
          <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
            <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[var(--active-text)] underline">supabase.com</a></li>
            <li>Run the migration SQL in the Supabase SQL editor (see below)</li>
            <li>Add env vars to Vercel: <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
            <li>Redeploy — tenants added here will be live instantly, no further deploys needed</li>
          </ol>
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono">Show migration SQL ▸</summary>
            <pre className="mt-2 bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-xl p-4 text-[10px] font-mono text-[var(--text-primary)] overflow-x-auto whitespace-pre">{`-- Run once in Supabase SQL editor

create table public.tenants (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  brand_name      text not null,
  primary_color   text not null default '#C8341A',
  accent_color    text,
  domain          text not null,
  azure_tenant_id text,
  plan            text not null default 'trial'
                  check (plan in ('trial', 'starter', 'pro')),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  logo_url        text,
  notes           text
);

-- Allow middleware (anon key) to read tenant by domain
alter table public.tenants enable row level security;
create policy "Public read"
  on public.tenants for select using (true);

-- Insert your existing tenants
insert into public.tenants
  (slug, name, brand_name, primary_color, domain, plan, active, created_at)
values
  ('default', 'EnterpriseHub', 'Enterprise Hub',
   '#C8341A', 'enterprises-hub.de', 'pro', true, '2026-01-01'),
  ('servicesphere', 'Servicesphere GmbH', 'Servicesphere Hub',
   '#C8341A', 'hub.servicesphere.de', 'trial', true, '2026-06-01');`}</pre>
          </details>
        </div>

        <p className="text-[10px] font-mono text-[var(--text-muted)] text-center pb-4">
          enterprises-hub.de · Superadmin · Internal use only
        </p>
      </main>
      )} {/* end clients tab */}

      {/* Edit drawer */}
      {editing && (
        <EditTenantDrawer
          tenant={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
