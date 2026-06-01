"use client";

import { useState, useEffect, useRef } from "react";
import { TabBar, SectionCard, Btn, FieldGroup, inputCls } from "./AdminUI";
import { useTenant, useTenantCtx } from "@/contexts/TenantContext";

export default function AdminBranding() {
  const tenant                        = useTenant();
  const { updateTenant, refreshTenant } = useTenantCtx();

  const [tab, setTab]     = useState("Theme Config");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  // Local form state — initialised from live tenant, kept in sync when tenant changes
  const [form, setForm] = useState({
    name:         tenant.name,
    brandName:    tenant.brandName,
    primaryColor: tenant.primaryColor,
    logoUrl:      tenant.logoUrl ?? "",
    domain:       tenant.domain,
  });

  // Sync form when tenant context updates (e.g. after a save or external change)
  useEffect(() => {
    setForm({
      name:         tenant.name,
      brandName:    tenant.brandName,
      primaryColor: tenant.primaryColor,
      logoUrl:      tenant.logoUrl ?? "",
      domain:       tenant.domain,
    });
  }, [tenant.slug]); // only re-init when slug changes (switching tenant), not on every keystroke save

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res  = await fetch("/api/admin/branding", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      // Optimistically push the new values into TenantContext immediately
      updateTenant({
        name:         data.name,
        brandName:    data.brandName,
        primaryColor: data.primaryColor,
        logoUrl:      data.logoUrl,
        domain:       data.domain,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    await refreshTenant(); // re-fetch from DB — discards local edits
  }

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Branding & White-label</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Customise the shell appearance for <strong>{tenant.name}</strong>.
          Changes apply live across the whole workspace.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Theme Config", "Preview"]} active={tab} onChange={setTab} admin />

      {tab === "Theme Config" && (
        <SectionCard title={`White-label Configuration — ${tenant.name}`}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Company Name">
                <input className={inputCls} value={form.name} onChange={set("name")} placeholder="Acme Corp" />
              </FieldGroup>
              <FieldGroup label="Shell Title (browser tab / topbar)">
                <input className={inputCls} value={form.brandName} onChange={set("brandName")} placeholder="Acme Hub" />
              </FieldGroup>
              <FieldGroup label="Primary Brand Colour">
                <div className="flex gap-2 items-center">
                  <input
                    className="w-10 h-9 rounded-lg border border-[var(--shell-border)] cursor-pointer p-0.5 bg-[var(--shell-bg)]"
                    type="color"
                    value={form.primaryColor}
                    onChange={set("primaryColor")}
                  />
                  <input
                    className={`${inputCls} flex-1 font-mono`}
                    value={form.primaryColor}
                    onChange={set("primaryColor")}
                    placeholder="#1A3AC8"
                    maxLength={7}
                  />
                </div>
              </FieldGroup>
              <FieldGroup label="Logo URL">
                <input className={inputCls} value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://cdn.example.com/logo.png" />
              </FieldGroup>
              <FieldGroup label="Custom Domain">
                <input className={inputCls} value={form.domain} onChange={set("domain")} placeholder="hub.yourcompany.com" />
              </FieldGroup>
            </div>

            {/* Logo preview */}
            {form.logoUrl && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Logo preview:</span>
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-8 max-w-[160px] object-contain rounded"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {/* Colour preview swatch */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)]">Brand colour preview:</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-[var(--shell-border)]" style={{ background: form.primaryColor }} />
                <span className="text-xs font-mono text-[var(--text-secondary)]">{form.primaryColor}</span>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {saved && <p className="text-xs text-[var(--green-status)]">✓ Branding saved — changes are live.</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[var(--admin)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "Saving…" : "Save Branding"}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-[var(--shell-border)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {tab === "Preview" && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--text-muted)] bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2">
            <strong className="text-[var(--admin)]">Live Preview:</strong> This is how the shell appears to{" "}
            <strong>{form.name}</strong> users at <code className="font-mono">{form.domain}</code>.
            The preview updates as you edit the Theme Config.
          </p>

          {/* Mini shell preview */}
          <div className="rounded-xl overflow-hidden border border-[var(--shell-border)] shadow-lg">
            {/* Preview topbar */}
            <div className="flex items-center gap-3 px-4 h-10" style={{ background: form.primaryColor }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-5 max-w-[80px] object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <div className="w-5 h-5 rounded bg-white/25 flex items-center justify-center text-white text-[10px] font-bold">
                  {form.brandName?.[0] ?? "E"}
                </div>
              )}
              <span className="text-white text-xs font-bold">{form.brandName || "Hub"}</span>
              <span className="ml-auto text-white/60 text-[10px]">{tenant.name} ▼</span>
            </div>

            {/* Preview body */}
            <div className="flex gap-0 bg-[var(--shell-bg)]">
              {/* Preview sidebar */}
              <div className="w-40 bg-[var(--shell-surface)] border-r border-[var(--shell-border)] p-2 text-[8px] text-[var(--text-muted)] flex flex-col gap-0.5">
                <div className="text-[7px] text-[var(--text-muted)] uppercase font-semibold tracking-widest px-2 py-1">Workspace</div>
                <div className="px-2 py-1.5 rounded text-[var(--text-secondary)]">Dashboard</div>
                <div className="px-2 py-1.5 rounded text-[var(--text-secondary)]">My Tasks</div>
                <div className="h-px bg-[var(--shell-border)] my-1" />
                <div className="text-[7px] text-[var(--text-muted)] uppercase font-semibold tracking-widest px-2 py-1">Apps</div>
                <div className="px-2 py-1.5 rounded" style={{ background: `${form.primaryColor}18`, color: form.primaryColor }}>SAP S/4HANA</div>
                <div className="px-2 py-1.5 rounded text-[var(--text-secondary)]">Salesforce</div>
                <div className="px-2 py-1.5 rounded text-[var(--text-secondary)]">Microsoft Teams</div>
              </div>

              {/* Preview main content */}
              <div className="flex-1 p-3 min-h-[140px]">
                <div className="text-[9px] font-semibold text-[var(--text-primary)] mb-2">Good morning — {form.name}</div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {[
                    { label: "Users", val: "—" },
                    { label: "Connectors", val: "—" },
                    { label: "Plan", val: tenant.plan ?? "Pro" },
                  ].map((c) => (
                    <div key={c.label} className="bg-[var(--shell-surface)] rounded p-1.5 border-t-2" style={{ borderColor: form.primaryColor }}>
                      <div className="text-[7px] text-[var(--text-muted)]">{c.label}</div>
                      <div className="text-[10px] font-bold text-[var(--text-primary)]">{c.val}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--shell-surface)] rounded px-2 py-1.5 text-[7px] text-[var(--text-secondary)] border-l-2" style={{ borderColor: form.primaryColor }}>
                  ✦ AI Copilot — Ask anything about your workspace
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center">
            Save your changes in Theme Config to apply them across the live workspace.
          </p>
        </div>
      )}
    </div>
  );
}
