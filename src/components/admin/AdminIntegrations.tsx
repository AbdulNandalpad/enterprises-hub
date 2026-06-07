"use client";

/**
 * AdminIntegrations — list of all integrations.
 *
 * Cards are launchers. Clicking a card opens ConnectorSetupPage — a full-page
 * wizard with step-by-step guidance, credential forms, principal propagation
 * config, AI scope, and sidebar settings. All stored persistently.
 *
 * Data sources:
 *   - INTEGRATIONS registry     — master list of every supported system
 *   - /api/integrations         — per-tenant enabled/nav state (GET + PATCH)
 *   - /api/admin/connectors     — credentials for SAP and Salesforce (POST/PATCH)
 *   - /api/admin/access-rules   — AI data scope per connector × role (GET + POST)
 */

import { useState, useEffect, useCallback } from "react";
import AppIcon from "@/components/AppIcon";
import {
  INTEGRATIONS,
  CATEGORY_ORDER,
} from "@/lib/integrations/registry";
import type { IntegrationDef, IntegrationState } from "@/lib/integrations/types";
import { IconSparkle, IconArrowRight } from "@/components/icons";
import ConnectorSetupPage from "./ConnectorSetupPage";

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

// ─── Integration card — launcher only, opens ConnectorSetupPage ───────────────

function IntegrationCard({
  def,
  state,
  connectorConfig,
  onToggleEnabled,
  onConfigure,
}: {
  def:             IntegrationDef;
  state:           IntegrationState | null;
  connectorConfig: ConnectorConfig | null;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onConfigure:     (id: string) => void;
}) {
  const enabled      = state?.enabled   ?? (def.configType === "always-on");
  const status       = state?.status     ?? "not_configured";
  const isConfigurable = def.configType !== "always-on";
  const needsSetup   = ["shared-org-oauth", "shared-org-api", "shared-org-mcp"].includes(def.configType) && !connectorConfig;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all group ${
        enabled ? "border-[var(--shell-border)] bg-[var(--shell-surface)]" : "border-[var(--shell-border)] bg-[var(--shell-bg)] opacity-60"
      }`}
      style={{ borderLeft: `3px solid ${def.color}` }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Logo */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${def.color}18` }}
        >
          <AppIcon slug={def.logo} color={def.color} size={17} />
        </div>

        {/* Name + description — clickable area */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => onConfigure(def.id)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--admin)] transition-colors">
              {def.name}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-muted)] uppercase tracking-wider">
              {def.category}
            </span>
            {def.aiContext && (
              <span className="flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin)]">
                <IconSparkle size={8} /> AI
              </span>
            )}
            {needsSetup && enabled && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200">
                Setup needed
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{def.description}</p>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={status} configType={def.configType} />
          {isConfigurable && (
            <Toggle
              checked={enabled}
              onChange={(v) => onToggleEnabled(def.id, v)}
            />
          )}
          {/* Configure button */}
          <button
            onClick={() => onConfigure(def.id)}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--admin)] transition-colors ml-1"
            title="Configure"
          >
            <span className="hidden sm:inline">Configure</span>
            <IconArrowRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminIntegrations() {
  const [states,      setStates]      = useState<IntegrationState[]>([]);
  const [connConfigs, setConnConfigs] = useState<ConnectorConfig[]>([]);
  const [rules,       setRules]       = useState<AccessRule[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  // null = show list; string = show detail page for that integration id
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
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

  // ── Detail page view ─────────────────────────────────────────────────────────
  if (selectedId) {
    const def = INTEGRATIONS.find((d) => d.id === selectedId);
    if (!def) return null;
    return (
      <ConnectorSetupPage
        def={def}
        state={getState(def.id)}
        connectorConfig={getConnectorConfig(def)}
        rules={rules}
        onBack={() => setSelectedId(null)}
        onRefresh={load}
      />
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Integrations</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Connect EnterpriseHub to your systems. Click any integration to open the full setup guide.
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
                  onToggleEnabled={(id, v) => patchState(id, { enabled: v })}
                  onConfigure={(id) => setSelectedId(id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

    </div>
  );
}
