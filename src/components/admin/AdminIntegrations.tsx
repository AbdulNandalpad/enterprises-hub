"use client";

/**
 * AdminIntegrations — the single admin page for all integrations.
 *
 * Admin sets everything up here once. Users just get a show/hide toggle
 * for their sidebar — no credentials, no OAuth flows, no tech jargon.
 *
 * Each integration card covers:
 *   - Enable / disable
 *   - Auth credentials (based on configType)
 *   - Show in sidebar nav toggle
 *   - AI data scope (per role) — inline, no separate tab
 *
 * Data sources:
 *   - INTEGRATIONS registry     — the master list of every supported system
 *   - /api/integrations         — per-tenant enabled/nav state (GET + PATCH)
 *   - /api/admin/connectors     — credentials for SAP and Salesforce (POST/PATCH)
 *   - /api/admin/access-rules   — AI data scope per connector × role (GET + POST)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import AppIcon from "@/components/AppIcon";
import { Insight } from "./AdminUI";
import {
  INTEGRATIONS,
  CATEGORY_ORDER,
} from "@/lib/integrations/registry";
import type { IntegrationDef, IntegrationState, IntegrationView } from "@/lib/integrations/types";
import {
  IconChevronDown, IconSparkle, IconShield, IconKey,
  IconArrowRight, IconBolt, IconInfo,
} from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type DataScope = "all" | "team" | "own" | "none";

interface AccessRule {
  connector_type: string;
  role:           string;
  ai_enabled:     boolean;
  data_scope:     DataScope;
}

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
  client_id:      string;
  is_active:      boolean;
}

const ROLES = ["Admin", "Manager", "Member"] as const;
type Role = typeof ROLES[number];
const DEFAULT_SCOPE: Record<Role, DataScope> = { Admin: "all", Manager: "team", Member: "own" };

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, configType }: { status: IntegrationState["status"]; configType: IntegrationDef["configType"] }) {
  if (configType === "always-on")
    return <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-text)]/20">Auto</span>;
  if (status === "connected")
    return <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200 dark:border-emerald-800">Connected</span>;
  if (status === "error")
    return <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-[var(--red-status)] border border-red-200">Error</span>;
  return <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--shell-bg)] text-[var(--text-muted)] border border-[var(--shell-border)]">Not set up</span>;
}

// ─── Compact toggle ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
        checked ? "bg-[var(--admin)]" : "bg-[var(--shell-border)]"
      }`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ─── Credential form — renders based on configType ───────────────────────────

function CredentialForm({
  def,
  connectorConfig,
  onSaved,
}: {
  def:             IntegrationDef;
  connectorConfig: ConnectorConfig | null;
  onSaved:         () => void;
}) {
  const isSAP      = def.legacyConnectorType?.startsWith("sap");
  const isSalesforce = def.legacyConnectorType === "salesforce";

  const [url,     setUrl]     = useState(connectorConfig?.instance_url ?? "");
  const [user,    setUser]    = useState(connectorConfig?.client_id    ?? "");
  const [secret,  setSecret]  = useState("");  // never pre-fill password
  const [saving,  setSaving]  = useState(false);
  const [ok,      setOk]      = useState(false);
  const [err,     setErr]     = useState("");

  const inputCls = "w-full text-xs border border-[var(--shell-border)] rounded px-2.5 py-1.5 bg-[var(--shell-bg)] text-[var(--text-primary)] outline-none focus:border-[var(--admin)] transition-colors placeholder:text-[var(--text-muted)]";

  if (def.configType === "always-on") {
    return (
      <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--active-bg)] border border-[var(--active-text)]/20 rounded-lg px-3 py-2.5">
        <IconBolt size={12} className="flex-shrink-0 mt-0.5 text-[var(--active-text)]" />
        <span>Active automatically for all Azure AD users. No credentials needed.</span>
        {def.scopes && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {def.scopes.map((s) => (
              <span key={s} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)]">{s}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (def.configType === "personal-oauth" || def.configType === "personal-credentials") {
    return (
      <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-3 py-2.5">
        <IconInfo size={12} className="flex-shrink-0 mt-0.5" />
        <span>Each user connects their own account individually. No admin credentials needed.</span>
      </div>
    );
  }

  if (def.configType === "app-link") {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-3 py-2.5">
        <IconArrowRight size={12} className="flex-shrink-0" />
        <span>Opens: <code className="font-mono text-[var(--text-secondary)]">{def.appUrl}</code></span>
      </div>
    );
  }

  // shared-org-oauth / shared-org-api / shared-org-mcp
  async function save() {
    setSaving(true); setErr(""); setOk(false);
    try {
      const res = await fetch("/api/admin/connectors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          connector_type: def.legacyConnectorType ?? def.id,
          label:          "Production",
          instance_url:   url.trim(),
          client_id:      user.trim(),
          client_secret:  secret.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setErr(d.error ?? "Failed to save");
        return;
      }
      setOk(true);
      setSecret("");
      onSaved();
      setTimeout(() => setOk(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-1">
        <IconKey size={10} />
        {def.authHint}
      </div>

      <div>
        <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
          {isSalesforce ? "Instance URL (My Domain)" : "Instance URL"}
        </label>
        <input
          className={inputCls}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={isSalesforce ? "https://yourorg.my.salesforce.com" : "https://myXXXXXX.crm.ondemand.com"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {isSalesforce ? "Consumer Key (Client ID)" : "API Username"}
          </label>
          <input
            className={inputCls}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder={isSalesforce ? "3MVG9…" : "api_user@company.com"}
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {isSalesforce ? "Consumer Secret" : "API Password"}
          </label>
          <input
            type="password"
            className={inputCls}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={connectorConfig ? "••••••••  (leave blank to keep)" : "••••••••••••"}
          />
        </div>
      </div>

      {/* Salesforce OAuth hint */}
      {isSalesforce && (
        <div className="text-[10px] text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-2.5 py-2 space-y-0.5">
          <p className="font-semibold text-[var(--text-secondary)]">Salesforce Connected App → OAuth Callback URL:</p>
          <code className="font-mono">{typeof window !== "undefined" ? window.location.origin : "{your-domain}"}/api/connectors/salesforce/callback</code>
          <p>Required scopes: <code className="font-mono">api refresh_token offline_access</code></p>
        </div>
      )}

      {/* SAP principal propagation hint */}
      {isSAP && (
        <div className="text-[10px] text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-2.5 py-2">
          <p className="font-semibold text-[var(--text-secondary)] mb-0.5">For per-user SAP access (principal propagation)</p>
          <p>Configure SAML Bearer Assertion in <strong>Auth & SSO → Principal Propagation</strong> after saving credentials.</p>
        </div>
      )}

      {err && <p className="text-[11px] text-[var(--red-status)]">{err}</p>}
      {ok  && <p className="text-[11px] text-emerald-600">Credentials saved.</p>}

      <button
        onClick={save}
        disabled={saving || !url || !user || (!secret && !connectorConfig)}
        className="px-3 py-1.5 text-xs font-semibold bg-[var(--admin)] text-white rounded-lg disabled:opacity-40 transition-colors hover:opacity-90"
      >
        {saving ? "Saving…" : connectorConfig ? "Update credentials" : "Save credentials"}
      </button>
    </div>
  );
}

// ─── AI scope row ─────────────────────────────────────────────────────────────

function AIScopeRow({
  connectorType,
  rules,
  onSave,
}: {
  connectorType: string;
  rules:         AccessRule[];
  onSave:        (connectorType: string, role: string, scope: DataScope, aiEnabled: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  function getRule(role: Role) {
    const found = rules.find((r) => r.connector_type === connectorType && r.role === role);
    return found ?? { data_scope: DEFAULT_SCOPE[role], ai_enabled: true, stored: false };
  }

  async function update(role: Role, scope: DataScope, aiEnabled: boolean) {
    setSaving(role);
    await onSave(connectorType, role, scope, aiEnabled);
    setSaving(null);
  }

  const selectCls = "text-[10px] rounded border border-[var(--shell-border)] px-1.5 py-1 bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--admin)] transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] flex-shrink-0">
        <IconSparkle size={10} />
        AI access:
      </span>
      {ROLES.map((role) => {
        const r = getRule(role);
        const isSaving = saving === role;
        return (
          <div key={role} className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{role}</span>
            <select
              value={r.data_scope}
              disabled={isSaving}
              onChange={(e) => update(role, e.target.value as DataScope, r.ai_enabled)}
              className={`${selectCls} ${isSaving ? "opacity-40" : ""}`}
            >
              <option value="all">All data</option>
              <option value="team">Team</option>
              <option value="own">Own only</option>
              <option value="none">No access</option>
            </select>
          </div>
        );
      })}
    </div>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({
  def,
  state,
  connectorConfig,
  rules,
  onToggleEnabled,
  onToggleNav,
  onCredentialsSaved,
  onScopeChange,
}: {
  def:              IntegrationDef;
  state:            IntegrationState | null;
  connectorConfig:  ConnectorConfig | null;
  rules:            AccessRule[];
  onToggleEnabled:  (id: string, enabled: boolean) => void;
  onToggleNav:      (id: string, show: boolean) => void;
  onCredentialsSaved: () => void;
  onScopeChange:    (connectorType: string, role: string, scope: DataScope, aiEnabled: boolean) => Promise<void>;
}) {
  const enabled   = state?.enabled   ?? (def.configType === "always-on");
  const showInNav = state?.show_in_nav ?? false;
  const status    = state?.status     ?? "not_configured";

  // Auto-open if always-on or connected — keep closed otherwise
  const [open, setOpen] = useState(def.configType === "always-on");

  const isConfigurable = def.configType !== "always-on";
  const hasCredentials = !!connectorConfig;
  const needsSetup     = ["shared-org-oauth", "shared-org-api", "shared-org-mcp"].includes(def.configType) && !hasCredentials;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      enabled
        ? "border-[var(--shell-border)] bg-[var(--shell-surface)]"
        : "border-[var(--shell-border)] bg-[var(--shell-bg)] opacity-60"
    }`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors select-none"
        onClick={() => setOpen((p) => !p)}
        style={{ borderLeft: `3px solid ${def.color}` }}
      >
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${def.color}18` }}>
          <AppIcon slug={def.logo} color={def.color} size={16} />
        </div>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{def.name}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-muted)] uppercase tracking-wider">{def.category}</span>
            {def.aiContext && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin)]">
                <IconSparkle size={8} /> AI
              </span>
            )}
            {needsSetup && enabled && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200">Setup needed</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{def.description}</p>
        </div>

        {/* Status + enable toggle */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={status} configType={def.configType} />
          {isConfigurable && (
            <Toggle
              checked={enabled}
              onChange={(v) => onToggleEnabled(def.id, v)}
            />
          )}
        </div>

        <IconChevronDown
          size={12}
          className={`text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Expanded body */}
      {open && (
        <div className="px-4 py-4 border-t border-[var(--shell-border)] space-y-4 bg-[var(--shell-bg)]">

          {/* Credential / auth section */}
          <CredentialForm
            def={def}
            connectorConfig={connectorConfig}
            onSaved={onCredentialsSaved}
          />

          {/* Show in sidebar — only for enabled integrations that aren't always-on */}
          {enabled && def.configType !== "always-on" && (
            <div className="flex items-center justify-between py-2 border-t border-[var(--shell-border)]">
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">Show in sidebar nav</p>
                <p className="text-[11px] text-[var(--text-muted)]">Users will see this as a nav item in their sidebar</p>
              </div>
              <Toggle checked={showInNav} onChange={(v) => onToggleNav(def.id, v)} />
            </div>
          )}

          {/* AI data scope — only for aiContext integrations with connector creds */}
          {def.aiContext && def.legacyConnectorType && hasCredentials && (
            <div className="pt-1 border-t border-[var(--shell-border)]">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-2">AI data access per role</p>
              <AIScopeRow
                connectorType={def.legacyConnectorType}
                rules={rules}
                onSave={onScopeChange}
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Controls how much data the Hub AI agent can see for each role. <strong>All</strong> = full system · <strong>Team</strong> = own + reports · <strong>Own</strong> = only their records · <strong>No access</strong> = AI blocked.
              </p>
            </div>
          )}

          {/* Docs link */}
          {def.docsUrl && (
            <a
              href={def.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--active-text)] hover:underline"
            >
              Documentation <IconArrowRight size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminIntegrations() {
  const [states,   setStates]   = useState<IntegrationState[]>([]);
  const [connConfigs, setConnConfigs] = useState<ConnectorConfig[]>([]);
  const [rules,    setRules]    = useState<AccessRule[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<string>("All");

  // Load all data in parallel
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statesRes, connsRes, rulesRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/admin/connectors"),
        fetch("/api/admin/access-rules"),
      ]);
      const statesData = await statesRes.json() as IntegrationState[];
      const connsData  = await connsRes.json()  as ConnectorConfig[];
      const rulesData  = await rulesRes.json()  as { rules?: AccessRule[] };
      setStates(Array.isArray(statesData) ? statesData : []);
      setConnConfigs(Array.isArray(connsData) ? connsData : []);
      setRules(rulesData.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Helpers to find state / connector config for an integration
  function getState(id: string): IntegrationState | null {
    return states.find((s) => s.integration_id === id) ?? null;
  }

  function getConnectorConfig(def: IntegrationDef): ConnectorConfig | null {
    if (!def.legacyConnectorType) return null;
    return connConfigs.find((c) => c.connector_type === def.legacyConnectorType) ?? null;
  }

  // Patch /api/integrations for enabled / show_in_nav
  async function patchState(id: string, patch: Partial<IntegrationState>) {
    await fetch("/api/integrations", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ integration_id: id, ...patch }),
    });
    setStates((prev) => {
      const existing = prev.find((s) => s.integration_id === id);
      if (existing) return prev.map((s) => s.integration_id === id ? { ...s, ...patch } : s);
      const def = INTEGRATIONS.find((d) => d.id === id);
      return [...prev, { integration_id: id, enabled: false, show_in_nav: false, status: "not_configured", ...patch } as IntegrationState];
    });
  }

  // Upsert access rule
  async function handleScopeChange(connectorType: string, role: string, scope: DataScope, aiEnabled: boolean) {
    await fetch("/api/admin/access-rules", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ connector_type: connectorType, role, data_scope: scope, ai_enabled: aiEnabled }),
    });
    setRules((prev) => {
      const existing = prev.findIndex((r) => r.connector_type === connectorType && r.role === role);
      const updated  = { connector_type: connectorType, role, data_scope: scope, ai_enabled: aiEnabled };
      if (existing >= 0) return prev.map((r, i) => i === existing ? updated : r);
      return [...prev, updated];
    });
  }

  // Filter integrations
  const filtered = INTEGRATIONS.filter((def) => {
    const matchSearch = !search.trim() ||
      def.name.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase()) ||
      def.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || def.category === category;
    return matchSearch && matchCat;
  });

  // Group by category in canonical order
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: filtered.filter((d) => d.category === cat) }))
    .filter(({ items }) => items.length > 0);

  // Count configured integrations
  const configuredCount = INTEGRATIONS.filter((def) => {
    const s = getState(def.id);
    if (def.configType === "always-on") return true;
    if (def.legacyConnectorType) return !!getConnectorConfig(def);
    return s?.status === "connected";
  }).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Integrations</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Connect EnterpriseHub to your systems. Set up once here — users only choose what to show in their sidebar.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)]" />

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span><strong className="text-[var(--text-primary)]">{configuredCount}</strong> of {INTEGRATIONS.length} configured</span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{states.filter((s) => s.show_in_nav).length}</strong> in sidebar nav</span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{INTEGRATIONS.filter((d) => d.aiContext).length}</strong> feed Hub AI</span>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations…"
          className="flex-1 text-sm px-3 py-2 bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--admin-border)]"
        />
        <div className="flex gap-1 flex-wrap">
          {(["All", ...CATEGORY_ORDER] as string[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                category === cat
                  ? "bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin)] font-medium"
                  : "border-[var(--shell-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integration list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--shell-border)] animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">No integrations match your search.</div>
      ) : (
        grouped.map(({ cat, items }) => (
          <div key={cat}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2 mt-2">
              {cat} <span className="opacity-50">({items.length})</span>
            </p>
            <div className="space-y-2">
              {items.map((def) => (
                <IntegrationCard
                  key={def.id}
                  def={def}
                  state={getState(def.id)}
                  connectorConfig={getConnectorConfig(def)}
                  rules={rules}
                  onToggleEnabled={(id, v) => patchState(id, { enabled: v })}
                  onToggleNav={(id, v) => patchState(id, { show_in_nav: v })}
                  onCredentialsSaved={load}
                  onScopeChange={handleScopeChange}
                />
              ))}
            </div>
          </div>
        ))
      )}

    </div>
  );
}
