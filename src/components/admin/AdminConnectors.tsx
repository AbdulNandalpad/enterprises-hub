"use client";

/**
 * AdminConnectors — register shared org connectors (Salesforce, SAP) and
 * configure per-role AI data-access rules for each connector.
 *
 * Tabs:
 *   Connected Systems  — list + enable/disable/delete registered connectors
 *   Add System         — form to register a new connector (admin only)
 *   Access Rules       — data-scope matrix: connector × role → scope + AI toggle
 *
 * All data is persisted in Supabase:
 *   connector_configs        — one row per registered system
 *   connector_access_rules   — one row per (connector_type × role)
 *
 * Per-user email/calendar accounts (IONOS, Gmail, CalDAV) live in
 * Personal Settings → Connections — not here.
 */

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { TabBar, SectionCard, Badge, Btn, FieldGroup, Insight, inputCls, selectCls } from "./AdminUI";
import { useRoles } from "@/contexts/RolesContext";
import { IconTrash, IconLink, IconSalesforce, IconTrendingUp, IconMail, IconShield, IconSparkle } from "@/components/icons";

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

interface AccessRule {
  id:             string;
  connector_type: string;
  role:           string;
  ai_enabled:     boolean;
  data_scope:     DataScope;
  updated_at:     string;
}

type DataScope = "all" | "team" | "own" | "none";

// ─── Static metadata ──────────────────────────────────────────────────────────

const CONNECTOR_META: Record<string, { name: string; color: string; authHint: string; group: string }> = {
  salesforce:      { name: "Salesforce",          color: "#00A1E0", authHint: "OAuth 2.0 — Consumer Key + Secret",    group: "CRM" },
  sap_sales_cloud: { name: "SAP Sales Cloud (C4C)",color: "#0070F3", authHint: "Basic Auth — API username + password", group: "ERP" },
  sap_s4hana:      { name: "SAP S/4HANA",          color: "#0070F3", authHint: "Basic Auth — API username + password", group: "ERP" },
};

const ROLES = ["Admin", "Manager", "Member"] as const;
type Role = typeof ROLES[number];

// Default scopes when no rule is stored — mirrors agent-side defaults
const DEFAULT_SCOPE: Record<Role, DataScope> = { Admin: "all", Manager: "team", Member: "own" };

const SCOPE_LABELS: Record<DataScope, { label: string; desc: string; color: string }> = {
  all:  { label: "All data",    desc: "Sees every record in the system",       color: "var(--blue)"          },
  team: { label: "Team",        desc: "Own records + direct reports",          color: "var(--active-text)"   },
  own:  { label: "Own only",    desc: "Only records assigned to themselves",   color: "var(--green-status)"  },
  none: { label: "No access",   desc: "AI cannot query this connector at all", color: "var(--red-status)"    },
};

// ─── Helper components ────────────────────────────────────────────────────────

function ConnectorIcon({ type }: { type: string }) {
  const bg = CONNECTOR_META[type]?.color ?? "#888";
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
      {type === "salesforce"
        ? <IconSalesforce size={16} className="text-white" />
        : <IconTrendingUp size={16} className="text-white" />
      }
    </div>
  );
}

function ScopePill({ scope }: { scope: DataScope }) {
  const { label, color } = SCOPE_LABELS[scope];
  return (
    <span className="inline-flex items-center font-mono text-[10px] px-2 py-0.5 rounded-full border leading-none"
      style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
      {label}
    </span>
  );
}

// ─── Connected Systems tab ────────────────────────────────────────────────────

function ConnectedSystems({
  configs, loading, isAdmin, deleting,
  onDelete, onToggle, onAddClick,
}: {
  configs:   ConnectorConfig[];
  loading:   boolean;
  isAdmin:   boolean;
  deleting:  string | null;
  onDelete:  (id: string) => void;
  onToggle:  (id: string, current: boolean) => void;
  onAddClick: () => void;
}) {
  const groups = Object.entries(
    configs.reduce<Record<string, ConnectorConfig[]>>((acc, c) => {
      const g = CONNECTOR_META[c.connector_type]?.group ?? "Other";
      (acc[g] ??= []).push(c);
      return acc;
    }, {})
  );

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map((i) => <div key={i} className="h-16 rounded-lg bg-[var(--shell-border)] animate-pulse" />)}
    </div>
  );

  if (configs.length === 0) return (
    <div className="py-12 flex flex-col items-center gap-2 text-center">
      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[var(--shell-border)] flex items-center justify-center">
        <IconLink size={18} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">No systems registered</p>
      <p className="text-xs text-[var(--text-muted)] max-w-xs">
        Add a Salesforce org or SAP system — users can then connect them from the dashboard widget.
      </p>
      {isAdmin && (
        <button onClick={onAddClick} className="mt-2 text-xs font-medium text-[var(--active-text)] hover:underline">
          Add first system →
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {groups.map(([groupName, items]) => (
        <div key={groupName}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">
            {groupName} ({items.length})
          </p>
          <div className="space-y-2">
            {items.map((c) => {
              const meta = CONNECTOR_META[c.connector_type] ?? { name: c.connector_type, color: "#888" };
              return (
                <div
                  key={c.id}
                  className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-3 flex items-center gap-3"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <ConnectorIcon type={c.connector_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.name}</span>
                      <Badge variant={c.is_active ? "green" : "gray"}>{c.label}</Badge>
                      {!c.is_active && <Badge variant="admin">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{c.instance_url}</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                      ID: {c.client_id.slice(0, 24)}…
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onToggle(c.id, c.is_active)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          c.is_active
                            ? "border-[var(--shell-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            : "border-[var(--green-status)] text-[var(--green-status)]"
                        }`}
                      >
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        disabled={deleting === c.id}
                        className="text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors p-1 rounded"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Access Rules tab ─────────────────────────────────────────────────────────

function AccessRules({ configs }: { configs: ConnectorConfig[] }) {
  const [rules,   setRules]   = useState<AccessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null); // "type:role"

  // Unique connector types that are actually registered
  const registeredTypes = [...new Set(configs.map((c) => c.connector_type))];

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/access-rules");
      const data = await res.json() as { rules?: AccessRule[]; error?: string };
      setRules(data.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Look up a rule, falling back to defaults if not configured
  function getRule(connectorType: string, role: Role): { scope: DataScope; aiEnabled: boolean; stored: boolean } {
    const found = rules.find((r) => r.connector_type === connectorType && r.role === role);
    return found
      ? { scope: found.data_scope, aiEnabled: found.ai_enabled, stored: true }
      : { scope: DEFAULT_SCOPE[role], aiEnabled: true, stored: false };
  }

  async function upsertRule(connectorType: string, role: string, patch: { data_scope?: DataScope; ai_enabled?: boolean }) {
    const key = `${connectorType}:${role}`;
    setSaving(key);
    try {
      // Get current values to merge
      const cur = getRule(connectorType, role as Role);
      await fetch("/api/admin/access-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          connector_type: connectorType,
          role,
          data_scope:  patch.data_scope  ?? cur.scope,
          ai_enabled:  patch.ai_enabled  ?? cur.aiEnabled,
        }),
      });
      await loadRules();
    } finally {
      setSaving(null);
    }
  }

  if (configs.length === 0) return (
    <div className="py-12 flex flex-col items-center gap-3 text-center">
      <IconShield size={24} className="text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)]">Register at least one connector first.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <Insight
        admin
        text={
          <>
            <strong className="text-[var(--admin)]">Data scope</strong> controls what each role's AI agent can see.{" "}
            <strong>All</strong> = full system · <strong>Team</strong> = own + reports · <strong>Own</strong> = assigned only · <strong>No access</strong> = AI cannot query this system.
            Unset rows use the defaults shown.
          </>
        }
      />

      {/* Scope legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(SCOPE_LABELS) as [DataScope, typeof SCOPE_LABELS[DataScope]][]).map(([scope, { label, desc }]) => (
          <div key={scope} className="flex items-center gap-1.5">
            <ScopePill scope={scope} />
            <span className="text-[10px] text-[var(--text-muted)]">{desc}</span>
          </div>
        ))}
      </div>

      {/* Matrix table */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map((i) => <div key={i} className="h-20 rounded-lg bg-[var(--shell-border)] animate-pulse" />)}
        </div>
      ) : (
        <div className="border border-[var(--shell-border)] rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="grid bg-[var(--shell-bg)] border-b border-[var(--shell-border)]"
            style={{ gridTemplateColumns: "1fr repeat(3, minmax(0, 1fr))" }}>
            <div className="px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Connector</span>
            </div>
            {ROLES.map((role) => (
              <div key={role} className="px-3 py-2.5 text-center border-l border-[var(--shell-border)]">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{role}</span>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {registeredTypes.map((connType, idx) => {
            const meta = CONNECTOR_META[connType] ?? { name: connType, color: "#888" };
            return (
              <div
                key={connType}
                className={`grid ${idx < registeredTypes.length - 1 ? "border-b border-[var(--shell-border)]" : ""}`}
                style={{ gridTemplateColumns: "1fr repeat(3, minmax(0, 1fr))" }}
              >
                {/* Connector name column */}
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{meta.name}</p>
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">{connType}</p>
                  </div>
                </div>

                {/* Role columns */}
                {ROLES.map((role) => {
                  const { scope, aiEnabled, stored } = getRule(connType, role);
                  const key = `${connType}:${role}`;
                  const isSaving = saving === key;

                  return (
                    <div key={role} className="border-l border-[var(--shell-border)] px-3 py-3 flex flex-col gap-2 items-center">
                      {/* Scope dropdown */}
                      <select
                        value={scope}
                        disabled={isSaving}
                        onChange={(e) => upsertRule(connType, role, { data_scope: e.target.value as DataScope })}
                        className={`w-full text-xs rounded border px-2 py-1 bg-[var(--shell-bg)] focus:outline-none transition-opacity ${
                          isSaving ? "opacity-40" : ""
                        } ${!stored ? "border-dashed border-[var(--shell-border)] text-[var(--text-muted)]" : "border-[var(--shell-border)] text-[var(--text-primary)]"}`}
                      >
                        <option value="all">All data</option>
                        <option value="team">Team</option>
                        <option value="own">Own only</option>
                        <option value="none">No access</option>
                      </select>

                      {/* AI enabled toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <span className="relative inline-block w-7 h-4 flex-shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={aiEnabled}
                            disabled={isSaving || scope === "none"}
                            onChange={(e) => upsertRule(connType, role, { ai_enabled: e.target.checked })}
                          />
                          <span className={`absolute inset-0 rounded-full transition-colors ${
                            aiEnabled && scope !== "none"
                              ? "bg-[var(--admin)]"
                              : "bg-[var(--shell-border)]"
                          }`} />
                          <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                            aiEnabled && scope !== "none" ? "translate-x-3" : ""
                          }`} />
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <IconSparkle size={9} />
                          AI
                        </span>
                      </label>

                      {/* Default indicator */}
                      {!stored && (
                        <span className="text-[9px] font-mono text-[var(--text-muted)] opacity-60">default</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">
        Changes save instantly. Dashed borders indicate unset rows using system defaults. Disabling AI on a connector prevents the AI agent from querying it regardless of scope.
      </p>
    </div>
  );
}

// ─── Add System tab ───────────────────────────────────────────────────────────

function AddSystem({ onAdded }: { onAdded: () => void }) {
  const [addType,   setAddType]   = useState("salesforce");
  const [addLabel,  setAddLabel]  = useState("Production");
  const [addUrl,    setAddUrl]    = useState("");
  const [addId,     setAddId]     = useState("");
  const [addSecret, setAddSecret] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk,    setFormOk]    = useState(false);

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
      onAdded();
      setTimeout(() => setFormOk(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const isSalesforce = addType === "salesforce";

  return (
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

        <FieldGroup label={isSalesforce ? "Instance URL (My Domain)" : "Instance URL"}>
          <input
            className={inputCls} required
            value={addUrl} onChange={(e) => setAddUrl(e.target.value)}
            placeholder={isSalesforce ? "https://yourorg.my.salesforce.com" : "https://myXXXXXX.crm.ondemand.com"}
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label={isSalesforce ? "Consumer Key (Client ID)" : "API Username"}>
            <input
              className={inputCls} required
              value={addId} onChange={(e) => setAddId(e.target.value)}
              placeholder={isSalesforce ? "3MVG9…" : "api_user@company.com"}
            />
          </FieldGroup>
          <FieldGroup label={isSalesforce ? "Consumer Secret" : "API Password"}>
            <input
              className={inputCls} required type="password"
              value={addSecret} onChange={(e) => setAddSecret(e.target.value)}
              placeholder="••••••••••••"
            />
          </FieldGroup>
        </div>

        {/* Auth method callout */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-3 py-2">
          <IconShield size={11} />
          Auth: {CONNECTOR_META[addType]?.authHint}
        </div>

        {/* Salesforce OAuth redirect hint */}
        {isSalesforce && (
          <div className="text-[11px] text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-3 py-2 space-y-1">
            <p className="font-semibold text-[var(--text-secondary)]">Salesforce Connected App setup</p>
            <p>In your Salesforce org: <strong>Setup → App Manager → New Connected App</strong></p>
            <p>OAuth Callback URL: <code className="font-mono bg-[var(--shell-border)] px-1 rounded">{"{your-domain}"}/api/connectors/salesforce/callback</code></p>
            <p>Required scopes: <code className="font-mono bg-[var(--shell-border)] px-1 rounded">api refresh_token offline_access</code></p>
          </div>
        )}

        {formError && <p className="text-xs text-[var(--red-status)]">{formError}</p>}
        {formOk    && <p className="text-xs text-[var(--green-status)]">System registered successfully.</p>}

        <div className="flex gap-2 pt-1">
          <Btn type="submit" variant="admin" disabled={saving}>
            {saving ? "Saving…" : "Save System"}
          </Btn>
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Microsoft Graph status card ──────────────────────────────────────────────

function GraphCard() {
  return (
    <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4 flex items-start gap-3"
      style={{ borderLeft: "3px solid #00a4ef" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
        style={{ background: "#00a4ef" }}>
        M
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Microsoft Graph</span>
          <Badge variant="green">MSAL</Badge>
          <Badge variant="green">Active</Badge>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Calendar, Email, Teams — authenticated via Azure AD MSAL. No stored credentials. Token acquired per-user at runtime.
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {["Calendars.Read", "Mail.Read", "User.Read", "Team.ReadBasic.All"].map((s) => (
            <span key={s} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-muted)]">
              {s}
            </span>
          ))}
        </div>
      </div>
      <span className="flex-shrink-0 font-mono text-[10px] text-[var(--text-muted)] text-right">
        No admin<br />config needed
      </span>
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

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/connectors");
      const data = await res.json() as ConnectorConfig[];
      setConfigs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this connector? Any widgets using it will stop working.")) return;
    setDeleting(id);
    await fetch(`/api/admin/connectors/${id}`, { method: "DELETE" });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/connectors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c));
  }

  const tabs = isAdmin
    ? ["Connected Systems", "Add System", "Access Rules"]
    : ["Connected Systems"];

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Connector Registry</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Register shared org connectors (Salesforce, SAP) and control which roles the AI can query — and how much they can see.
        </p>
      </div>

      {/* Per-user email note */}
      <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--text-muted)]">
        <IconMail size={13} className="flex-shrink-0 mt-0.5 text-[var(--text-secondary)]" />
        <span>
          <strong className="text-[var(--text-secondary)]">Looking for IONOS, Gmail or personal email?</strong>{" "}
          Those are per-user — each person connects their own mailbox in{" "}
          <strong className="text-[var(--text-secondary)]">Personal Settings → Connections</strong>. No admin setup needed.
        </span>
      </div>

      <div className="h-px bg-[var(--shell-border)] my-4" />

      <TabBar tabs={tabs} active={tab} onChange={setTab} admin />

      {/* ── Connected Systems ──────────────────────────────────────────────── */}
      {tab === "Connected Systems" && (
        <div className="space-y-4">
          <ConnectedSystems
            configs={configs}
            loading={loading}
            isAdmin={isAdmin}
            deleting={deleting}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onAddClick={() => setTab("Add System")}
          />
          {/* Microsoft Graph always shown as a separate read-only entry */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Microsoft 365</p>
            <GraphCard />
          </div>
        </div>
      )}

      {/* ── Add System ──────────────────────────────────────────────────────── */}
      {tab === "Add System" && isAdmin && (
        <AddSystem onAdded={() => { loadConfigs(); }} />
      )}

      {/* ── Access Rules ────────────────────────────────────────────────────── */}
      {tab === "Access Rules" && isAdmin && (
        <AccessRules configs={configs} />
      )}
    </div>
  );
}
