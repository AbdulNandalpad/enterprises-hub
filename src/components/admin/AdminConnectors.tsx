"use client";

/**
 * AdminConnectors — register and manage Salesforce orgs and SAP systems.
 * Each entry is stored in connector_configs (Supabase) per tenant.
 * Widgets read credentials from here — nothing is hardcoded in env vars.
 */

import { useState, useEffect, type FormEvent } from "react";
import { TabBar, SectionCard, Badge, Btn, FieldGroup, inputCls, selectCls } from "./AdminUI";
import { useRoles } from "@/contexts/RolesContext";
import { IconTrash, IconLink, IconSalesforce, IconTrendingUp } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
  client_id:      string;
  is_active:      boolean;
  created_at:     string;
}

const CONNECTOR_LABELS: Record<string, { name: string; color: string; authHint: string }> = {
  salesforce:       { name: "Salesforce",         color: "#00A1E0", authHint: "OAuth 2.0 — Consumer Key + Secret" },
  sap_sales_cloud:  { name: "SAP Sales Cloud",    color: "#0070F3", authHint: "Basic Auth — API username + password" },
  sap_s4hana:       { name: "SAP S/4HANA",        color: "#0070F3", authHint: "Basic Auth — API username + password" },
};

// ─── Helper components ────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  if (type === "salesforce") {
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#00A1E0" }}>
        <IconSalesforce size={16} className="text-white" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#0070F3" }}>
      <IconTrendingUp size={16} className="text-white" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminConnectors() {
  const { isAdmin } = useRoles();
  const [tab,      setTab]      = useState("Connected Systems");
  const [configs,  setConfigs]  = useState<ConnectorConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add-form state
  const [addType,   setAddType]   = useState("salesforce");
  const [addLabel,  setAddLabel]  = useState("Production");
  const [addUrl,    setAddUrl]    = useState("");
  const [addId,     setAddId]     = useState("");
  const [addSecret, setAddSecret] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk,    setFormOk]    = useState(false);

  // ── Load configs ─────────────────────────────────────────────────────────────

  async function loadConfigs() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/connectors");
      const data = await res.json() as ConnectorConfig[];
      setConfigs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfigs(); }, []);

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Remove this connector? Any widgets using it will stop working.")) return;
    setDeleting(id);
    await fetch(`/api/admin/connectors/${id}`, { method: "DELETE" });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/connectors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
  }

  // ── Add connector ─────────────────────────────────────────────────────────────

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormOk(false);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connector_type: addType,
          label:          addLabel,
          instance_url:   addUrl.trim(),
          client_id:      addId.trim(),
          client_secret:  addSecret.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        setFormError(err.error ?? "Failed to save");
        return;
      }

      setFormOk(true);
      setAddUrl(""); setAddId(""); setAddSecret("");
      await loadConfigs();
      setTimeout(() => { setFormOk(false); setTab("Connected Systems"); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  // ── Group by type ──────────────────────────────────────────────────────────────

  const sfConfigs  = configs.filter((c) => c.connector_type === "salesforce");
  const sapConfigs = configs.filter((c) => c.connector_type.startsWith("sap"));

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Connector Registry</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Register Salesforce orgs and SAP systems. Each entry can be selected individually in dashboard widgets.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      <TabBar
        tabs={isAdmin ? ["Connected Systems", "Add System"] : ["Connected Systems"]}
        active={tab}
        onChange={setTab}
        admin
      />

      {/* ── Connected Systems ─────────────────────────────────────────────────── */}
      {tab === "Connected Systems" && (
        <div className="space-y-5">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--shell-border)] animate-pulse" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[var(--shell-border)] flex items-center justify-center">
                <IconLink size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">No systems registered</p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Add a Salesforce org or SAP system — users can then connect them from the dashboard widget.
              </p>
              {isAdmin && (
                <button
                  onClick={() => setTab("Add System")}
                  className="mt-2 text-xs font-medium text-[var(--active-text)] hover:underline"
                >
                  Add first system →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Salesforce group */}
              {sfConfigs.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Salesforce ({sfConfigs.length})
                  </p>
                  <div className="space-y-2">
                    {sfConfigs.map((c) => <ConnectorRow key={c.id} config={c} onDelete={handleDelete} onToggle={handleToggle} deleting={deleting} isAdmin={isAdmin} />)}
                  </div>
                </div>
              )}

              {/* SAP group */}
              {sapConfigs.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    SAP ({sapConfigs.length})
                  </p>
                  <div className="space-y-2">
                    {sapConfigs.map((c) => <ConnectorRow key={c.id} config={c} onDelete={handleDelete} onToggle={handleToggle} deleting={deleting} isAdmin={isAdmin} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Add System ────────────────────────────────────────────────────────── */}
      {tab === "Add System" && isAdmin && (
        <SectionCard title="Register a new system">
          <form onSubmit={handleAdd} className="p-4 space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="System type">
                <select className={selectCls} value={addType} onChange={(e) => setAddType(e.target.value)}>
                  <option value="salesforce">Salesforce</option>
                  <option value="sap_sales_cloud">SAP Sales Cloud (C4C)</option>
                  <option value="sap_s4hana">SAP S/4HANA</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Environment label">
                <select className={selectCls} value={addLabel} onChange={(e) => setAddLabel(e.target.value)}>
                  {["Production", "QA", "Sandbox", "Staging", "Development"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </FieldGroup>
            </div>

            <FieldGroup label="Instance URL">
              <input
                className={inputCls}
                required
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder={
                  addType === "salesforce"
                    ? "https://yourorg.my.salesforce.com"
                    : "https://myXXXXXX.crm.ondemand.com"
                }
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label={addType === "salesforce" ? "Consumer Key (Client ID)" : "API Username"}>
                <input
                  className={inputCls}
                  required
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  placeholder={addType === "salesforce" ? "3MVG9..." : "api_user@company.com"}
                />
              </FieldGroup>

              <FieldGroup label={addType === "salesforce" ? "Consumer Secret" : "API Password"}>
                <input
                  className={inputCls}
                  required
                  type="password"
                  value={addSecret}
                  onChange={(e) => setAddSecret(e.target.value)}
                  placeholder="••••••••••••"
                />
              </FieldGroup>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-3 py-2">
              Auth: {CONNECTOR_LABELS[addType]?.authHint}
            </div>

            {formError && (
              <p className="text-xs text-[var(--red-status)]">{formError}</p>
            )}
            {formOk && (
              <p className="text-xs text-[var(--green-status)]">System registered successfully.</p>
            )}

            <div className="flex gap-2 pt-1">
              <Btn variant="admin" disabled={saving}>
                {saving ? "Saving…" : "Save System"}
              </Btn>
              <Btn type="button" onClick={() => setTab("Connected Systems")}>
                Cancel
              </Btn>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function ConnectorRow({
  config,
  onDelete,
  onToggle,
  deleting,
  isAdmin,
}: {
  config:   ConnectorConfig;
  onDelete: (id: string) => void;
  onToggle: (id: string, current: boolean) => void;
  deleting: string | null;
  isAdmin:  boolean;
}) {
  const meta = CONNECTOR_LABELS[config.connector_type] ?? { name: config.connector_type, color: "#888" };

  return (
    <div
      className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-3 flex items-center gap-3"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <TypeIcon type={config.connector_type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.name}</span>
          <Badge variant={config.is_active ? "green" : "admin"}>
            {config.label}
          </Badge>
          {!config.is_active && <Badge variant="admin">Disabled</Badge>}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{config.instance_url}</p>
        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
          ID: {config.client_id.slice(0, 20)}…
        </p>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(config.id, config.is_active)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              config.is_active
                ? "border-[var(--shell-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                : "border-[var(--green-status)] text-[var(--green-status)]"
            }`}
          >
            {config.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => onDelete(config.id)}
            disabled={deleting === config.id}
            className="text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors p-1 rounded"
          >
            <IconTrash size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
