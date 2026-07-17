"use client";

/**
 * ConnectorWizard — the "wrapper → next → next → go" connector setup.
 *
 * Every connector in the registry is a pre-built **wrapper**: the endpoint
 * shape, the auth method, and the AI scopes are already baked in. The customer
 * never designs a connector — they only supply the one tenant-specific thing
 * their lane needs, then click through.
 *
 * Three visual steps, always:
 *   1 — Review   → what this wrapper connects + what the AI will read
 *   2 — Authorize→ adapts to the wrapper's lane (see wrapperLane below)
 *   3 — Go live  → test + switch it on
 *
 * Onboarding lanes (derived from IntegrationDef.configType):
 *   instant   — nothing to enter. Rides Azure AD SSO, or is just an app launcher.
 *   one-click — approve once on the vendor's screen (OAuth).
 *   paste-key — paste a service-account URL + key your IT team provides.
 *
 * All saves reuse the existing APIs — no new endpoints:
 *   POST  /api/admin/connectors            (credentials)
 *   PATCH /api/admin/connectors/[id]       (activate / SAML extra_config)
 *   PATCH /api/integrations                (enable + show in nav)
 */

import { useState, useMemo } from "react";
import AppIcon from "@/components/AppIcon";
import { Btn, FieldGroup, inputCls } from "./AdminUI";
import {
  IconArrowRight, IconSparkle, IconBolt, IconKey, IconLink,
  IconShield, IconCheckSquare, IconX, IconPlug,
} from "@/components/icons";
import type { IntegrationDef, IntegrationState } from "@/lib/integrations/types";

// ─── Shared shapes (mirror ConnectorSetupPage props) ──────────────────────────

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
  client_id:      string;
  is_active:      boolean;
  extra_config?:  Record<string, string>;
}

export interface ConnectorWizardProps {
  def:             IntegrationDef;
  state:           IntegrationState | null;
  connectorConfig: ConnectorConfig | null;
  onBack:          () => void;
  onRefresh:       () => Promise<void>;
}

// ─── Lane derivation — the heart of the wrapper concept ───────────────────────

type Lane = "instant" | "one-click" | "paste-key";

function wrapperLane(def: IntegrationDef): Lane {
  switch (def.configType) {
    case "always-on":
    case "app-link":
      return "instant";
    case "shared-org-oauth":
    case "personal-oauth":
      return "one-click";
    default: // shared-org-api, shared-org-mcp, personal-credentials
      return "paste-key";
  }
}

const LANE_LABEL: Record<Lane, string> = {
  "instant":   "Instant · no setup",
  "one-click": "One click · approve on vendor screen",
  "paste-key": "Paste a key · from your IT team",
};

/** Real OAuth start endpoint, if one exists for this wrapper. */
function oauthStartUrl(def: IntegrationDef): string | null {
  if (def.legacyConnectorType === "salesforce") return "/api/connectors/salesforce/auth";
  return null;
}

/** connector_type key used by /api/admin/connectors (falls back to id). */
function connectorType(def: IntegrationDef): string {
  return def.legacyConnectorType ?? def.id;
}

// ─── Step rail ────────────────────────────────────────────────────────────────

function StepRail({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 transition-colors ${
                  done
                    ? "bg-[var(--green-status)] text-white"
                    : active
                      ? "bg-[var(--admin)] text-white"
                      : "bg-[var(--shell-bg)] text-[var(--text-muted)] border border-[var(--shell-border)]"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`w-6 h-px ${done ? "bg-[var(--green-status)]" : "bg-[var(--shell-border)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConnectorWizard({
  def, state, connectorConfig, onBack, onRefresh,
}: ConnectorWizardProps) {
  const lane = useMemo(() => wrapperLane(def), [def]);
  const isSap = def.legacyConnectorType?.startsWith("sap") ?? false;

  const alreadyLive =
    def.configType === "always-on" ||
    (state?.enabled ?? false) && (connectorConfig?.is_active ?? def.configType === "app-link");

  const [step, setStep] = useState(0);
  const STEPS = ["Review", "Authorize", "Go live"];

  // credential form state (paste-key / oauth fallback)
  const [url,      setUrl]      = useState(connectorConfig?.instance_url ?? "");
  const [clientId, setClientId] = useState(connectorConfig?.client_id ?? "");
  const [secret,   setSecret]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [authDone, setAuthDone] = useState(lane === "instant" || !!connectorConfig);
  const [error,    setError]    = useState("");

  // go-live state
  const [testing,  setTesting]  = useState(false);
  const [testMsg,  setTestMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [live,     setLive]     = useState(alreadyLive);
  const [showInNav, setShowInNav] = useState(state?.show_in_nav ?? false);

  // ── save credentials (paste-key + oauth fallback) ────────────────────────────
  async function saveCredentials(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      await fetch("/api/admin/connectors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          connector_type: connectorType(def),
          label:          def.name,
          instance_url:   url.trim(),
          client_id:      clientId.trim(),
          client_secret:  secret || undefined,
          is_active:      true,
        }),
      });
      await onRefresh();
      setAuthDone(true);
      return true;
    } catch {
      setError("Couldn't save. Check your network and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ── test connection where an endpoint exists ─────────────────────────────────
  async function runTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      let ok = true;
      if (def.legacyConnectorType === "salesforce") {
        const r = await fetch("/api/connectors/salesforce/status");
        ok = r.ok;
      } else if (isSap) {
        const r = await fetch("/api/connectors/sap/data");
        ok = r.ok;
      }
      setTestMsg(
        ok
          ? { ok: true,  text: "Connection healthy — live data reached." }
          : { ok: false, text: "Reached the wrapper, but the system rejected the request. Re-check the key." }
      );
    } catch {
      setTestMsg({ ok: false, text: "Couldn't reach the system. Check the URL and network route." });
    } finally {
      setTesting(false);
    }
  }

  // ── flip it on ───────────────────────────────────────────────────────────────
  async function goLive() {
    setEnabling(true);
    try {
      await fetch("/api/integrations", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ integration_id: def.id, enabled: true, show_in_nav: showInNav }),
      });
      await onRefresh();
      setLive(true);
    } finally {
      setEnabling(false);
    }
  }

  // ── step gating ──────────────────────────────────────────────────────────────
  const canAdvanceFromAuth =
    lane === "instant" ? true :
    lane === "one-click" ? authDone :
    authDone;

  // ─── Header ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back + title */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--admin)] transition-colors"
      >
        <IconArrowRight size={11} className="rotate-180" />
        All connectors
      </button>

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${def.color}18` }}
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
                <IconSparkle size={8} /> Feeds Hub AI
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{def.description}</p>
        </div>
      </div>

      {/* Lane banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <IconPlug size={13} className="text-[var(--admin)] flex-shrink-0" />
        <span className="text-xs text-[var(--text-secondary)]">
          Pre-built wrapper · <strong className="text-[var(--text-primary)]">{LANE_LABEL[lane]}</strong>
        </span>
      </div>

      {/* If already live — short-circuit to a managed state */}
      {live ? (
        <LiveState def={def} onBack={onBack} />
      ) : (
        <>
          <StepRail step={step} labels={STEPS} />
          <div className="h-px bg-[var(--shell-border)]" />

          {/* ── STEP 1 · REVIEW ─────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  icon={<IconLink size={13} />}
                  title="What it connects"
                  body={`Live ${def.category} data from ${def.name} over its official API — no copies, no ETL.`}
                />
                <InfoTile
                  icon={<IconSparkle size={13} />}
                  title="What the AI reads"
                  body={def.aiContext
                    ? "Live records become answerable in Hub AI and the report builder, scoped by each user's role."
                    : "This wrapper is a launcher only — it does not feed data into Hub AI."}
                />
                <InfoTile
                  icon={<IconKey size={13} />}
                  title="How it signs in"
                  body={def.authHint ?? (lane === "instant"
                    ? "Rides your existing Azure AD single sign-on. Nothing to enter."
                    : "One-time authorization, then tokens refresh automatically.")}
                />
                <InfoTile
                  icon={<IconShield size={13} />}
                  title="Where secrets live"
                  body="Encrypted at rest in your tenant's database. Never shown to users, never logged."
                />
              </div>

              {def.scopes && def.scopes.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Scopes this wrapper requests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {def.scopes.map((s) => (
                      <code key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--shell-surface)] border border-[var(--shell-border)] text-[var(--text-secondary)]">
                        {s}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Btn variant="admin" onClick={() => setStep(1)}>
                  Next →
                </Btn>
              </div>
            </div>
          )}

          {/* ── STEP 2 · AUTHORIZE ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {lane === "instant" && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--active-border)] bg-[var(--active-bg)]">
                  <IconBolt size={14} className="text-[var(--active-text)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--active-text)]">Nothing to authorize</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                      {def.configType === "always-on"
                        ? `${def.name} is already reachable through your Azure AD login. Every signed-in user is connected the moment they log in.`
                        : `${def.name} is an app launcher — it opens in a new tab and needs no credentials.`}
                    </p>
                  </div>
                </div>
              )}

              {lane === "one-click" && oauthStartUrl(def) && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Click below to approve EnterpriseHub on {def.name}&apos;s own consent screen.
                    You&apos;ll be sent back here automatically — no keys to copy.
                  </p>
                  <a
                    href={oauthStartUrl(def)!}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded bg-[var(--admin)] text-white hover:bg-purple-700 transition-colors"
                  >
                    <AppIcon slug={def.logo} color="#fff" size={14} />
                    Connect with {def.name}
                  </a>
                </div>
              )}

              {/* one-click with no start endpoint yet → fall back to a one-time key */}
              {((lane === "one-click" && !oauthStartUrl(def)) || lane === "paste-key") && (
                <div className="space-y-4">
                  <div className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4">
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono mb-1.5">
                      What to paste
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {def.authHint
                        ? <>Your {def.name} admin provides: <strong>{def.authHint}</strong>.</>
                        : <>A service-account URL and key from your {def.name} administrator.</>}
                      {" "}One-time — the wrapper handles refresh from here.
                    </p>
                  </div>

                  <FieldGroup label="Instance URL">
                    <input className={inputCls} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
                  </FieldGroup>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldGroup label="Client ID / API user">
                      <input className={inputCls} placeholder="api_user@company.com" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" />
                    </FieldGroup>
                    <FieldGroup label="Secret / API key">
                      <input className={inputCls} type="password" placeholder="••••••••••••" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" />
                      {connectorConfig && !secret && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Leave blank to keep the existing key</p>
                      )}
                    </FieldGroup>
                  </div>

                  {isSap && <SapAdvanced connectorConfig={connectorConfig} onRefresh={onRefresh} />}

                  {error && <p className="text-xs text-[var(--red-status)]">{error}</p>}
                  {authDone && !error && <p className="text-xs text-emerald-600">✓ Key saved &amp; encrypted.</p>}

                  <Btn
                    variant="admin"
                    disabled={saving || !url.trim() || !clientId.trim()}
                    onClick={saveCredentials}
                  >
                    {saving ? "Saving…" : connectorConfig ? "Update key" : "Save key"}
                  </Btn>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Btn onClick={() => setStep(0)}>← Back</Btn>
                <Btn variant="admin" disabled={!canAdvanceFromAuth} onClick={() => setStep(2)}>
                  Next →
                </Btn>
              </div>
            </div>
          )}

          {/* ── STEP 3 · GO LIVE ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Test (only where a real test endpoint exists) */}
              {(def.legacyConnectorType === "salesforce" || isSap) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Btn onClick={runTest} disabled={testing}>
                      {testing ? "Testing…" : "Test connection"}
                    </Btn>
                    {testMsg && (
                      <span className={`flex items-center gap-1 text-xs ${testMsg.ok ? "text-emerald-600" : "text-[var(--red-status)]"}`}>
                        {testMsg.ok ? <IconCheckSquare size={12} /> : <IconX size={12} />}
                        {testMsg.text}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Show in sidebar */}
              {def.configType !== "always-on" && (
                <label className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Add to everyone&apos;s sidebar</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Users can still hide it from their own My Apps settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showInNav}
                    onClick={() => setShowInNav((v) => !v)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${showInNav ? "bg-[var(--admin)]" : "bg-[var(--shell-border)]"}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${showInNav ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </label>
              )}

              <div className="flex items-center justify-between pt-2">
                <Btn onClick={() => setStep(1)}>← Back</Btn>
                <Btn variant="admin" disabled={enabling} onClick={goLive}>
                  {enabling ? "Switching on…" : "Go live →"}
                </Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Live confirmation ────────────────────────────────────────────────────────

function LiveState({ def, onBack }: { def: IntegrationDef; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
        <div className="w-9 h-9 rounded-full bg-[var(--green-status)] text-white flex items-center justify-center flex-shrink-0">
          <IconCheckSquare size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{def.name} is live</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
            {def.aiContext
              ? "Hub AI and the report builder can now query it — scoped by each user's role."
              : "It's available to your users now."}
            {" "}The wrapper keeps its own tokens fresh; you won&apos;t need to touch it again.
          </p>
        </div>
      </div>
      {def.appUrl && (
        <a
          href={def.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--active-text)] hover:underline"
        >
          Open {def.name} ↗
        </a>
      )}
      <div>
        <Btn onClick={onBack}>← Back to all connectors</Btn>
      </div>
    </div>
  );
}

// ─── Info tile ────────────────────────────────────────────────────────────────

function InfoTile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-4 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
      <div className="flex items-center gap-1.5 text-[var(--admin)] mb-1.5">
        {icon}
        <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Optional SAP principal propagation (kept from the old wizard) ────────────

function SapAdvanced({
  connectorConfig, onRefresh,
}: {
  connectorConfig: ConnectorConfig | null;
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [endpoint, setEndpoint] = useState(connectorConfig?.extra_config?.saml_token_endpoint ?? "");
  const [resource, setResource] = useState(connectorConfig?.extra_config?.saml_resource ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!connectorConfig) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/connectors/${connectorConfig.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ extra_config: { saml_token_endpoint: endpoint, saml_resource: resource } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--shell-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--shell-surface)] text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <IconShield size={12} className="text-[var(--admin)]" />
          Optional · per-user SAP access (principal propagation)
        </span>
        <span className="text-[var(--text-muted)] text-xs">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3 bg-[var(--shell-bg)]">
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Leave this off and the AI calls SAP as the shared service account. Turn it on and
            the AI calls SAP <em>as the logged-in user</em>, so SAP enforces each
            person&apos;s own authorizations. Requires a one-time SAML trust from your SAP Basis team.
          </p>
          <FieldGroup label="SAP OAuth token endpoint">
            <input className={inputCls} placeholder="https://…/oauth/token" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="SAP resource / audience URL">
            <input className={inputCls} placeholder="https://myXXXXXX.s4hana.ondemand.com" value={resource} onChange={(e) => setResource(e.target.value)} />
          </FieldGroup>
          {saved && <p className="text-xs text-emerald-600">✓ SAML config saved.</p>}
          <Btn variant="admin" disabled={saving || !connectorConfig || !endpoint.trim() || !resource.trim()} onClick={save}>
            {saving ? "Saving…" : "Save SAML config"}
          </Btn>
          {!connectorConfig && (
            <p className="text-xs text-[var(--amber-status)]">Save the key above first.</p>
          )}
        </div>
      )}
    </div>
  );
}
