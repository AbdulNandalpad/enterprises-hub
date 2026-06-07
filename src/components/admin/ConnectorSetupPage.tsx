"use client";

/**
 * ConnectorSetupPage — full-page wizard for configuring a single integration.
 *
 * Replaces the expandable card in AdminIntegrations when admin clicks a connector.
 * Shows all sections scrollably:
 *   0 — What this integration does
 *   1 — Credentials / auth setup  (adapts to configType)
 *   2 — Principal Propagation     (SAP connectors only)
 *   3 — AI data access            (if aiContext)
 *   4 — Sidebar & display         (if not always-on)
 *
 * Each section saves independently. State persists while connection is alive.
 */

import { useState, useCallback } from "react";
import AppIcon from "@/components/AppIcon";
import { Badge, Btn, FieldGroup, Insight, inputCls, selectCls } from "./AdminUI";
import {
  IconArrowRight, IconSparkle, IconShield, IconCheckSquare, IconInfo,
  IconLink, IconKey, IconBolt,
} from "@/components/icons";
import type { IntegrationDef, IntegrationState } from "@/lib/integrations/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DataScope = "all" | "team" | "own" | "none";

interface ConnectorConfig {
  id:            string;
  connector_type: string;
  label:         string;
  instance_url:  string;
  client_id:     string;
  is_active:     boolean;
  extra_config?: Record<string, string>;
}

interface AccessRule {
  connector_type: string;
  role:           string;
  ai_enabled:     boolean;
  data_scope:     DataScope;
}

const ROLES = ["Admin", "Manager", "Member"] as const;
type Role = typeof ROLES[number];
const DEFAULT_SCOPE: Record<Role, DataScope> = { Admin: "all", Manager: "team", Member: "own" };

export interface ConnectorSetupPageProps {
  def:             IntegrationDef;
  state:           IntegrationState | null;
  connectorConfig: ConnectorConfig | null;
  rules:           AccessRule[];
  onBack:          () => void;
  /** Refresh all data after a save (called by child sections) */
  onRefresh:       () => Promise<void>;
}

// ─── Step status chip ─────────────────────────────────────────────────────────

type StepStatus = "done" | "partial" | "todo" | "optional" | "auto";

function StepChip({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    done:     { label: "✓ Configured",  cls: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800" },
    partial:  { label: "Setup needed",  cls: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200" },
    todo:     { label: "Not set",       cls: "bg-[var(--shell-bg)] text-[var(--text-muted)] border-[var(--shell-border)]" },
    optional: { label: "Optional",      cls: "bg-[var(--shell-bg)] text-[var(--text-muted)] border-[var(--shell-border)]" },
    auto:     { label: "Automatic",     cls: "bg-[var(--active-bg)] text-[var(--active-text)] border-[var(--active-border)]" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SetupSection({
  step, title, subtitle, status, children,
}: {
  step:      string;
  title:     string;
  subtitle?: string;
  status:    StepStatus;
  children:  React.ReactNode;
}) {
  const accentColor =
    status === "done"     ? "var(--green-status)" :
    status === "partial"  ? "var(--amber-status)" :
    status === "auto"     ? "var(--active-text)"  : "var(--shell-border)";

  return (
    <div
      className="rounded-xl border border-[var(--shell-border)] overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 px-5 py-4 bg-[var(--shell-surface)] border-b border-[var(--shell-border)]">
        <span
          className="font-mono text-[11px] font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: accentColor === "var(--shell-border)" ? "var(--shell-bg)" : `${accentColor}18`, color: accentColor }}
        >
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
            <StepChip status={status} />
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {/* Body */}
      <div className="px-5 py-5 bg-[var(--shell-bg)] space-y-5">
        {children}
      </div>
    </div>
  );
}

// ─── SAP Basis checklist (non-interactive — guidance only) ────────────────────

const SAP_BASIS_STEPS = [
  {
    label: "Create a dedicated OData service user in SAP",
    detail: "Not a dialog user — use transaction SU01. Assign roles for the OData services you need (e.g. /sap/opu/odata/sap/). The user should have no SAP GUI access.",
  },
  {
    label: "Note the S/4HANA system URL",
    detail: "Cloud: https://myXXXXXX.s4hana.ondemand.com  ·  On-premise: https://sapserver.company.com:44300",
  },
  {
    label: "For principal propagation — add Azure AD as a trusted IdP in SAP BTP",
    detail: "In SAP BTP cockpit → Security → Trust Configuration → Add SAML Identity Provider. Download the Azure AD federation metadata XML from Entra ID and upload it here.",
  },
  {
    label: "Map Azure AD 'email' attribute to the SAP user principal",
    detail: "In Trust Configuration → the Azure AD IdP entry → Role Collection Mappings or Attribute Mappings — map the Azure AD claim 'email' to the SAP user attribute.",
  },
  {
    label: "Grant the SAP OAuth client the 'uaa.user' scope",
    detail: "In SAP BTP → Security → OAuth → Clients — find or create the client used for the Bearer Assertion Grant and add the uaa.user scope.",
  },
];

// ─── Section 1: Credentials (shared-org-api — SAP / generic) ─────────────────

function CredentialsSection({
  def, connectorConfig, onRefresh,
}: {
  def:             IntegrationDef;
  connectorConfig: ConnectorConfig | null;
  onRefresh:       () => Promise<void>;
}) {
  const isSap        = def.legacyConnectorType?.startsWith("sap") ?? false;
  const isSalesforce = def.legacyConnectorType === "salesforce";

  const [url,      setUrl]      = useState(connectorConfig?.instance_url ?? "");
  const [clientId, setClientId] = useState(connectorConfig?.client_id    ?? "");
  const [secret,   setSecret]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  const hasExisting = !!connectorConfig;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (hasExisting && connectorConfig) {
        await fetch(`/api/admin/connectors/${connectorConfig.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ is_active: true }),
        });
        // Also update fields via a separate PATCH if values changed
        if (url !== connectorConfig.instance_url || clientId !== connectorConfig.client_id) {
          // POST a new entry (upsert pattern — API deduplicates by connector_type + label)
          await fetch("/api/admin/connectors", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              connector_type: def.legacyConnectorType,
              label:          def.name,
              instance_url:   url,
              client_id:      clientId,
              client_secret:  secret || undefined,
              is_active:      true,
            }),
          });
        }
      } else {
        await fetch("/api/admin/connectors", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            connector_type: def.legacyConnectorType,
            label:          def.name,
            instance_url:   url,
            client_id:      clientId,
            client_secret:  secret || undefined,
            is_active:      true,
          }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await onRefresh();
    } catch {
      setError("Save failed — check your network and try again.");
    } finally {
      setSaving(false);
    }
  }

  const urlPlaceholder = isSap
    ? (def.legacyConnectorType === "sap_s4hana"
        ? "https://myXXXXXX.s4hana.ondemand.com"
        : "https://myXXXXXX.crm.ondemand.com")
    : isSalesforce
      ? "https://yourorg.my.salesforce.com"
      : "https://";

  const idLabel     = isSalesforce ? "Consumer Key (Client ID)" : "API Username";
  const secretLabel = isSalesforce ? "Consumer Secret"          : "API Password";
  const idPlaceholder     = isSalesforce ? "3MVG9…" : "api_user@company.com";
  const secretPlaceholder = isSalesforce ? "••••••••••••" : "••••••••••••";

  return (
    <div className="space-y-4">
      {/* What is this service account for? */}
      <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4 space-y-2">
        <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
          What you need from your {isSap ? "SAP Basis" : "IT"} team
        </p>
        {isSap ? (
          <ul className="space-y-1.5">
            {[
              "A dedicated OData API service user (not a regular dialog user)",
              "Read authorizations on the relevant OData services",
              `The ${def.legacyConnectorType === "sap_s4hana" ? "S/4HANA" : "SAP Sales Cloud"} instance URL`,
              "The API username and password for that service user",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-mono text-[var(--text-muted)] flex-shrink-0 mt-0.5">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        ) : isSalesforce ? (
          <ul className="space-y-1.5">
            {[
              "A Connected App in Salesforce Setup → App Manager",
              "The Consumer Key and Consumer Secret from that Connected App",
              "Your Salesforce org URL",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-mono text-[var(--text-muted)] flex-shrink-0 mt-0.5">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">
            An API service account and the system URL from your {def.name} administrator.
          </p>
        )}
      </div>

      {/* URL field */}
      <FieldGroup label="Instance URL">
        <input
          className={inputCls}
          placeholder={urlPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </FieldGroup>

      {/* ID + Secret row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldGroup label={idLabel}>
          <input
            className={inputCls}
            placeholder={idPlaceholder}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
          />
        </FieldGroup>
        <FieldGroup label={secretLabel}>
          <input
            className={inputCls}
            type="password"
            placeholder={secretPlaceholder}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="new-password"
          />
          {hasExisting && !secret && (
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Leave blank to keep existing password</p>
          )}
        </FieldGroup>
      </div>

      {error && <p className="text-xs text-[var(--red-status)]">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">✓ Credentials saved successfully.</p>}

      <div className="flex items-center gap-3">
        <Btn variant="admin" disabled={saving || !url.trim() || !clientId.trim()} onClick={handleSave}>
          {saving ? "Saving…" : hasExisting ? "Update credentials" : "Save credentials"}
        </Btn>
        {hasExisting && (
          <span className="text-xs text-[var(--text-muted)]">
            Connected to{" "}
            <code className="font-mono bg-[var(--shell-surface)] px-1 rounded">
              {connectorConfig?.instance_url}
            </code>
          </span>
        )}
      </div>

      {/* Encryption note */}
      <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
        <IconKey size={10} />
        Credentials are encrypted at rest in your Supabase database. Never logged or exposed to users.
      </p>
    </div>
  );
}

// ─── Section 2: Principal Propagation (SAP only) ─────────────────────────────

function PrincipalPropSection({
  connectorConfig, onRefresh,
}: {
  connectorConfig: ConnectorConfig | null;
  onRefresh:       () => Promise<void>;
}) {
  const existing = connectorConfig?.extra_config;

  const [endpoint, setEndpoint] = useState(existing?.saml_token_endpoint ?? "");
  const [resource, setResource] = useState(existing?.saml_resource        ?? "");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  const hasConfig = !!existing?.saml_token_endpoint;

  async function handleSave() {
    if (!connectorConfig) return;
    setSaving(true);
    setError("");
    try {
      await fetch(`/api/admin/connectors/${connectorConfig.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          extra_config: { saml_token_endpoint: endpoint, saml_resource: resource },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await onRefresh();
    } catch {
      setError("Save failed — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Explanation */}
      <Insight
        admin
        text={
          <>
            <strong className="text-[var(--admin)]">Without this:</strong> the AI assistant calls SAP as the shared service account — all users see the same data.{" "}
            <strong className="text-[var(--admin)]">With this:</strong> the AI calls SAP as the logged-in user — each person only sees their own authorizations enforced by SAP. No extra passwords needed.
          </>
        }
      />

      {/* SAP Basis side — numbered checklist */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <IconShield size={12} className="text-[var(--admin)]" />
          SAP side — one-time setup by your SAP Basis admin
        </p>
        <div className="space-y-2">
          {SAP_BASIS_STEPS.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]"
            >
              <span className="font-mono text-[10px] font-bold text-[var(--admin)] w-5 h-5 rounded bg-[var(--admin-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{s.label}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EnterpriseHub side */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
          <IconBolt size={12} className="text-[var(--active-text)]" />
          EnterpriseHub side — enter these after SAP Basis completes the steps above
        </p>
        <div className="space-y-3">
          <FieldGroup label="SAP OAuth Token Endpoint">
            <input
              className={inputCls}
              placeholder="https://myXXXXXX.authentication.eu10.hana.ondemand.com/oauth/token"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Found in SAP BTP → Security → OAuth → Token URL
            </p>
          </FieldGroup>

          <FieldGroup label="SAP Resource / Audience URL">
            <input
              className={inputCls}
              placeholder={connectorConfig?.instance_url || "https://myXXXXXX.s4hana.ondemand.com"}
              value={resource}
              onChange={(e) => setResource(e.target.value)}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Usually the same as the Instance URL above — used as the OAuth &apos;resource&apos; parameter
            </p>
          </FieldGroup>

          {error && <p className="text-xs text-[var(--red-status)]">{error}</p>}
          {saved && <p className="text-xs text-emerald-600">✓ SAML configuration saved.</p>}
          {!connectorConfig && (
            <p className="text-xs text-[var(--amber-status)]">
              ⚠ Save the service account credentials (Step 1) first.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Btn
              variant="admin"
              disabled={saving || !connectorConfig || !endpoint.trim() || !resource.trim()}
              onClick={handleSave}
            >
              {saving ? "Saving…" : hasConfig ? "Update SAML config" : "Save SAML config"}
            </Btn>
            {hasConfig && (
              <span className="text-xs text-emerald-600">✓ SAML Bearer configured</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section 3: AI Data Access ────────────────────────────────────────────────

function AiAccessSection({
  connectorType, rules, onRefresh,
}: {
  connectorType: string;
  rules:         AccessRule[];
  onRefresh:     () => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  function getRule(role: Role) {
    return rules.find((r) => r.connector_type === connectorType && r.role === role) ??
      { data_scope: DEFAULT_SCOPE[role], ai_enabled: true };
  }

  async function update(role: Role, scope: DataScope) {
    setSaving(role);
    try {
      await fetch("/api/admin/access-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ connector_type: connectorType, role, data_scope: scope, ai_enabled: true }),
      });
      await onRefresh();
    } finally {
      setSaving(null);
    }
  }

  const SCOPE_LABELS: Record<DataScope, string> = {
    all:  "All data — no filter",
    team: "Team data only",
    own:  "Own records only",
    none: "No AI access",
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Controls what data the AI assistant can see when responding to each role.
        Changes take effect immediately — no restart needed.
      </p>

      <div className="space-y-2">
        {ROLES.map((role) => {
          const rule = getRule(role);
          const isSaving = saving === role;
          return (
            <div
              key={role}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]"
            >
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{role}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{SCOPE_LABELS[rule.data_scope as DataScope]}</p>
              </div>
              <select
                className={`${selectCls} w-44 ${isSaving ? "opacity-40" : ""}`}
                value={rule.data_scope}
                disabled={isSaving}
                onChange={(e) => update(role, e.target.value as DataScope)}
              >
                <option value="all">All data</option>
                <option value="team">Team only</option>
                <option value="own">Own only</option>
                <option value="none">No access</option>
              </select>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
        <IconSparkle size={10} />
        These rules apply when Hub AI queries this system on a user&apos;s behalf.
      </p>
    </div>
  );
}

// ─── Section 4: Sidebar & Display ────────────────────────────────────────────

function SidebarSection({
  def, state, onRefresh,
}: {
  def:       IntegrationDef;
  state:     IntegrationState | null;
  onRefresh: () => Promise<void>;
}) {
  const [showInNav, setShowInNav] = useState(state?.show_in_nav ?? false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  async function handleSave(value: boolean) {
    setShowInNav(value);
    setSaving(true);
    try {
      await fetch("/api/integrations", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ integration_id: def.id, show_in_nav: value }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Show in nav */}
      <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">Show in sidebar nav</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Adds {def.name} as a nav item in every user&apos;s sidebar. Users can then hide it from their own{" "}
            <strong>My Apps</strong> settings.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={showInNav}
          disabled={saving}
          onClick={() => handleSave(!showInNav)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${showInNav ? "bg-[var(--admin)]" : "bg-[var(--shell-border)]"}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${showInNav ? "translate-x-4" : "translate-x-0"}`}
          />
        </button>
      </div>

      {saved && <p className="text-xs text-emerald-600">✓ Sidebar settings saved.</p>}

      {def.appUrl && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <IconLink size={12} className="text-[var(--text-muted)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{def.appUrl}</p>
          </div>
          <a
            href={def.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--active-text)] hover:underline flex-shrink-0"
          >
            Open ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Always-on info section ───────────────────────────────────────────────────

function AlwaysOnInfo({ def }: { def: IntegrationDef }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--active-border)] bg-[var(--active-bg)]">
        <IconBolt size={14} className="text-[var(--active-text)] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--active-text)]">Automatic — no setup required</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {def.name} is active for every user who signs in via Azure AD / Microsoft Entra ID.
            EnterpriseHub uses MSAL to acquire tokens silently — no credentials stored.
          </p>
        </div>
      </div>
      {def.scopes && def.scopes.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Microsoft Graph scopes requested</p>
          <div className="flex flex-wrap gap-1.5">
            {def.scopes.map((s) => (
              <code key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--shell-surface)] border border-[var(--shell-border)] text-[var(--text-secondary)]">
                {s}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ConnectorSetupPage({
  def, state, connectorConfig, rules, onBack, onRefresh,
}: ConnectorSetupPageProps) {
  const isSap        = def.legacyConnectorType?.startsWith("sap") ?? false;
  const isAlwaysOn   = def.configType === "always-on";
  const needsCreds   = ["shared-org-api", "shared-org-oauth", "shared-org-mcp"].includes(def.configType);
  const hasCreds     = !!connectorConfig;
  const hasSaml      = !!connectorConfig?.extra_config?.saml_token_endpoint;

  // Overall status for the connection header
  const overallStatus: StepStatus =
    isAlwaysOn  ? "auto"    :
    hasCreds    ? "done"    :
    "todo";

  // Step statuses
  const credStatus:    StepStatus = hasCreds  ? "done" : "todo";
  const samlStatus:    StepStatus = hasSaml   ? "done" : "optional";
  const enabled = state?.enabled ?? false;

  // Enable/disable toggle
  const [toggling, setToggling] = useState(false);
  async function handleToggle() {
    setToggling(true);
    try {
      await fetch("/api/integrations", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ integration_id: def.id, enabled: !enabled }),
      });
      await onRefresh();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <IconArrowRight size={12} className="rotate-180" />
          Back to Integrations
        </button>

        {/* Connector identity row */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${def.color}18`, border: `1.5px solid ${def.color}30` }}
          >
            <AppIcon slug={def.logo} color={def.color} size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{def.name}</h1>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-muted)] uppercase tracking-wider">
                {def.category}
              </span>
              {def.aiContext && (
                <span className="flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin)]">
                  <IconSparkle size={8} /> AI
                </span>
              )}
              <StepChip status={overallStatus} />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">{def.description}</p>
          </div>

          {/* Enable toggle — right side */}
          {!isAlwaysOn && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-[var(--text-muted)]">{enabled ? "Enabled" : "Disabled"}</span>
              <button
                role="switch"
                aria-checked={enabled}
                disabled={toggling}
                onClick={handleToggle}
                className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${enabled ? "bg-[var(--admin)]" : "bg-[var(--shell-border)]"}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-[var(--shell-border)]" />

      {/* ── Section 0: What this integration does ──────────────────────────── */}
      <SetupSection
        step="○"
        title="What this integration does"
        status={isAlwaysOn ? "auto" : hasCreds ? "done" : "todo"}
      >
        {isAlwaysOn ? (
          <AlwaysOnInfo def={def} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {getCapabilities(def).map((cap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] text-center"
                >
                  <div className="text-lg mb-1">{cap.icon}</div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">{cap.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{cap.detail}</p>
                </div>
              ))}
            </div>
            {def.authHint && (
              <p className="text-[11px] font-mono text-[var(--text-muted)]">
                Auth method: {def.authHint}
              </p>
            )}
          </div>
        )}
      </SetupSection>

      {/* ── Section 1: Credentials ─────────────────────────────────────────── */}
      {needsCreds && (
        <SetupSection
          step="1"
          title="Service account credentials"
          subtitle="Stored encrypted — users never see these"
          status={credStatus}
        >
          {def.configType === "shared-org-mcp" ? (
            <McpSection def={def} connectorConfig={connectorConfig} onRefresh={onRefresh} />
          ) : (
            <CredentialsSection def={def} connectorConfig={connectorConfig} onRefresh={onRefresh} />
          )}
        </SetupSection>
      )}

      {/* ── Section 2: Principal Propagation (SAP only) ────────────────────── */}
      {isSap && (
        <SetupSection
          step="2"
          title="Principal Propagation"
          subtitle="Per-user SAP identity — AI calls SAP as the logged-in user, not a shared account"
          status={samlStatus}
        >
          <PrincipalPropSection connectorConfig={connectorConfig} onRefresh={onRefresh} />
        </SetupSection>
      )}

      {/* ── Section 3: AI Data Access ──────────────────────────────────────── */}
      {def.aiContext && def.legacyConnectorType && (
        <SetupSection
          step={isSap ? "3" : "2"}
          title="AI data access per role"
          subtitle="Controls what Hub AI can see when responding to each role"
          status="done"
        >
          <AiAccessSection
            connectorType={def.legacyConnectorType}
            rules={rules}
            onRefresh={onRefresh}
          />
        </SetupSection>
      )}

      {/* ── Section 4: Sidebar & Display ───────────────────────────────────── */}
      {!isAlwaysOn && (
        <SetupSection
          step={isSap ? "4" : def.aiContext && def.legacyConnectorType ? "3" : "2"}
          title="Sidebar & display"
          subtitle="Controls how this app appears in users' sidebars"
          status={state?.show_in_nav ? "done" : "optional"}
        >
          <SidebarSection def={def} state={state} onRefresh={onRefresh} />
        </SetupSection>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 pb-6 border-t border-[var(--shell-border)]">
        <div className="flex items-center gap-3">
          {def.docsUrl && (
            <a
              href={def.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--active-text)] hover:underline flex items-center gap-1"
            >
              <IconInfo size={12} />
              Documentation ↗
            </a>
          )}
        </div>
        <button
          onClick={onBack}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
        >
          <IconArrowRight size={12} className="rotate-180" />
          Back to all integrations
        </button>
      </div>

    </div>
  );
}

// ─── MCP section (for shared-org-mcp) ────────────────────────────────────────

function McpSection({
  def, connectorConfig, onRefresh,
}: {
  def:             IntegrationDef;
  connectorConfig: ConnectorConfig | null;
  onRefresh:       () => Promise<void>;
}) {
  const [url,   setUrl]   = useState(connectorConfig?.instance_url ?? "");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/connectors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          connector_type: def.legacyConnectorType ?? def.id,
          label:          def.name,
          instance_url:   url,
          client_id:      "mcp",
          client_secret:  token || undefined,
          is_active:      true,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-secondary)]">
        Connect to a running MCP server. The server handles all API communication with {def.name}.
      </p>
      <FieldGroup label="MCP Server URL">
        <input
          className={inputCls}
          placeholder="https://mcp.yourserver.com/sse"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </FieldGroup>
      <FieldGroup label="Bearer Token">
        <input
          className={inputCls}
          type="password"
          placeholder="••••••••••••"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </FieldGroup>
      {saved && <p className="text-xs text-emerald-600">✓ MCP server saved.</p>}
      <Btn variant="admin" disabled={saving || !url.trim()} onClick={handleSave}>
        {saving ? "Saving…" : connectorConfig ? "Update server" : "Save server"}
      </Btn>
    </div>
  );
}

// ─── Capability cards per connector ──────────────────────────────────────────

function getCapabilities(def: IntegrationDef): { icon: string; title: string; detail: string }[] {
  const id = def.id;
  if (id === "sap-s4hana" || id === "sap-erp") return [
    { icon: "📦", title: "Orders & Inventory",  detail: "Live order status, stock levels, delivery tracking" },
    { icon: "💶", title: "Finance",              detail: "Invoices, accounts receivable, P&L via OData API" },
    { icon: "🤖", title: "AI Context",           detail: "Powers cross-system reports and the AI assistant" },
  ];
  if (id === "sap-sales-cloud") return [
    { icon: "🤝", title: "CRM & Pipeline",       detail: "Opportunities, accounts, contacts from SAP C4C" },
    { icon: "📊", title: "Sales Analytics",      detail: "Revenue, win rates, forecast data" },
    { icon: "🤖", title: "AI Context",           detail: "AI assistant can answer CRM questions" },
  ];
  if (id === "salesforce") return [
    { icon: "🤝", title: "CRM & Leads",          detail: "Contacts, opportunities, cases, accounts" },
    { icon: "📈", title: "Pipeline",             detail: "Forecast, stage tracking, activity history" },
    { icon: "🤖", title: "AI Context",           detail: "AI can query Salesforce on user's behalf" },
  ];
  if (id === "sap-btp") return [
    { icon: "🔗", title: "Integration Hub",      detail: "Connects SAP cloud services via MCP server" },
    { icon: "⚡", title: "Real-time events",     detail: "Event mesh and workflow triggers" },
    { icon: "🤖", title: "AI Context",           detail: "Feeds live BTP data into Hub AI" },
  ];
  // Generic fallback
  return [
    { icon: "🔌", title: "Connected",            detail: `${def.name} data available in EnterpriseHub` },
    { icon: "🤖", title: def.aiContext ? "AI Ready" : "App Link", detail: def.aiContext ? "Powers Hub AI with live context" : "Available in sidebar" },
    { icon: "👥", title: "Role-aware",           detail: "Admin controls what each role can see" },
  ];
}
