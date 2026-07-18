"use client";

/**
 * AdminIntegrations — list of all integrations.
 *
 * Cards are launchers. Clicking a card opens ConnectorWizard — the
 * "wrapper → next → next → go" flow: Review → Authorize → Go live. Each
 * connector is a pre-built wrapper, so the admin only supplies what their
 * lane needs (nothing / one OAuth click / one pasted key).
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
import ConnectorWizard from "./ConnectorWizard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
  client_id:      string;
  is_active:      boolean;
}

// ─── Onboarding lanes — the "how to configure" layer ──────────────────────────

type Lane = "instant" | "one-click" | "paste-key";

function connectorLane(def: IntegrationDef): Lane {
  switch (def.configType) {
    case "always-on":
    case "app-link":
      return "instant";
    case "shared-org-oauth":
    case "personal-oauth":
      return "one-click";
    default:
      return "paste-key";
  }
}

const LANE_META: Record<Lane, { label: string; how: string; chip: string }> = {
  "instant": {
    label: "Instant",
    how:   "No setup — connected the moment users sign in with Azure AD, or opens as an app launcher.",
    chip:  "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  "one-click": {
    label: "One click",
    how:   "Approve EnterpriseHub on the vendor's own screen. No keys to copy.",
    chip:  "bg-[var(--active-bg)] text-[var(--active-text)] border-[var(--active-border)]",
  },
  "paste-key": {
    label: "Paste a key",
    how:   "Paste a service-account URL and key your IT team provides. One time.",
    chip:  "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200",
  },
};

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

// ─── Integration card — launcher only, opens ConnectorWizard ──────────────────

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
  const [loading,     setLoading]     = useState(true);
  // Drill-down: null category = show TYPES; category set = show its connectors;
  // selectedId set = show the ConnectorWizard for that connector.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedId,       setSelectedId]       = useState<string | null>(null);

  // Load all data in parallel
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statesRes, connsRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/admin/connectors"),
      ]);
      const statesData = await statesRes.json() as IntegrationState[];
      const connsData  = await connsRes.json()  as ConnectorConfig[];
      setStates(Array.isArray(statesData) ? statesData : []);
      setConnConfigs(Array.isArray(connsData) ? connsData : []);
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

  // Categories that actually have connectors, in canonical order
  const categories = CATEGORY_ORDER
    .map((cat) => ({ cat, items: INTEGRATIONS.filter((d) => d.category === cat) }))
    .filter(({ items }) => items.length > 0);

  function isConfigured(def: IntegrationDef): boolean {
    const s = getState(def.id);
    if (def.configType === "always-on") return true;
    if (def.legacyConnectorType) return !!getConnectorConfig(def);
    return s?.status === "connected";
  }

  // ── STEP 3 · the connector (wizard) ──────────────────────────────────────────
  if (selectedId) {
    const def = INTEGRATIONS.find((d) => d.id === selectedId);
    if (!def) return null;
    return (
      <ConnectorWizard
        def={def}
        state={getState(def.id)}
        connectorConfig={getConnectorConfig(def)}
        onBack={() => setSelectedId(null)}
        onRefresh={load}
      />
    );
  }

  // ── STEP 2 · how to configure (connectors within one type) ───────────────────
  if (selectedCategory) {
    const items = INTEGRATIONS.filter((d) => d.category === selectedCategory);
    // group the type's connectors by onboarding lane
    const byLane = (["instant", "one-click", "paste-key"] as Lane[])
      .map((ln) => ({ ln, list: items.filter((d) => connectorLane(d) === ln) }))
      .filter(({ list }) => list.length > 0);

    return (
      <div className="space-y-5">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--admin)] transition-colors"
        >
          <IconArrowRight size={11} className="rotate-180" />
          All connector types
        </button>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--admin)] mb-1">Step 2 · How these connect</p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{selectedCategory}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {items.length} connector{items.length === 1 ? "" : "s"}. Each is grouped by how it&apos;s set up — pick one to configure.
          </p>
        </div>
        <div className="h-px bg-[var(--shell-border)]" />

        {byLane.map(({ ln, list }) => (
          <div key={ln}>
            {/* Lane explainer — the "how to configure" layer */}
            <div className="flex items-start gap-2 mb-2">
              <span className={`mt-0.5 font-mono text-[10px] px-2 py-0.5 rounded-full border ${LANE_META[ln].chip}`}>
                {LANE_META[ln].label}
              </span>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{LANE_META[ln].how}</p>
            </div>
            <div className="space-y-2 mb-5">
              {list.map((def) => (
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
        ))}
      </div>
    );
  }

  // ── STEP 1 · choose a connector type ─────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--admin)] mb-1">Step 1 · Choose a type</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Connectors</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Pick the kind of system you want to connect. Every connector is a pre-built wrapper — review, authorize, go live.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)]" />

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span><strong className="text-[var(--text-primary)]">{INTEGRATIONS.filter(isConfigured).length}</strong> of {INTEGRATIONS.length} configured</span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{states.filter((s) => s.show_in_nav).length}</strong> in sidebar nav</span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{INTEGRATIONS.filter((d) => d.aiContext).length}</strong> feed Hub AI</span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-[var(--shell-border)] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map(({ cat, items }) => {
            const configured = items.filter(isConfigured).length;
            const logos = items.slice(0, 5);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="text-left border border-[var(--shell-border)] rounded-xl p-4 bg-[var(--shell-surface)] hover:border-[var(--admin-border)] hover:bg-[var(--hover-bg)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex -space-x-1.5">
                    {logos.map((d) => (
                      <div
                        key={d.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center ring-2 ring-[var(--shell-surface)]"
                        style={{ background: `${d.color}18` }}
                      >
                        <AppIcon slug={d.logo} color={d.color} size={13} />
                      </div>
                    ))}
                  </div>
                  <IconArrowRight size={13} className="text-[var(--text-muted)] group-hover:text-[var(--admin)] transition-colors" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--admin)] transition-colors">{cat}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {items.length} connector{items.length === 1 ? "" : "s"} · {configured} configured
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
