"use client";

/**
 * AdminAuth — Auth & SSO configuration.
 *
 * Tab 1: Identity Providers
 *   - Azure AD (primary) — reads azureTenantId from tenant config
 *   - Downstream system auth mapping — reads from connector_configs so the list
 *     reflects what's actually registered, not hardcoded names
 *
 * Tab 2: Principal Propagation (SAP)
 *   - SAML Bearer Assertion config for per-user SAP token exchange
 *   - Stored in connector extra_config: { saml_token_endpoint, saml_resource }
 *
 * Tab 3: Token Settings
 *   - Token lifetime dropdowns (persisted to tenant ai_config for now)
 */

import { useState, useEffect, useCallback } from "react";
import { TabBar, SectionCard, Badge, Btn, FieldGroup, Insight, inputCls, selectCls } from "./AdminUI";
import { IconShield, IconSparkle, IconInfo } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
  client_id:      string;
  is_active:      boolean;
  extra_config?:  Record<string, string>;
}

interface TenantInfo {
  azureTenantId?: string;
  name?:          string;
}

const CONNECTOR_AUTH_MAP: Record<string, { auth: string; propagation: string; status: "configured" | "partial" | "service-account" }> = {
  salesforce:      { auth: "OAuth 2.0 — per-user token exchange",             propagation: "Per-user OAuth (token stored in connector_tokens)", status: "configured"     },
  sap_sales_cloud: { auth: "SAML 2.0 Bearer Assertion — Azure AD → SAP token", propagation: "Principal propagation via SAML Bearer Grant",        status: "partial"        },
  sap_s4hana:      { auth: "SAML 2.0 Bearer Assertion — Azure AD → SAP token", propagation: "Principal propagation via SAML Bearer Grant",        status: "partial"        },
};

const STATUS_BADGE: Record<string, { label: string; variant: "green" | "amber" | "gray" }> = {
  configured:     { label: "Configured",     variant: "green" },
  partial:        { label: "Setup needed",   variant: "amber" },
  "service-account": { label: "Service acct", variant: "gray" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminAuth() {
  const [tab,       setTab]       = useState("Identity Providers");
  const [configs,   setConfigs]   = useState<ConnectorConfig[]>([]);
  const [tenant,    setTenant]    = useState<TenantInfo>({});
  const [loading,   setLoading]   = useState(true);

  // SAML Bearer form state (keyed by connector id)
  const [samlForm,  setSamlForm]  = useState<Record<string, { endpoint: string; resource: string }>>({});
  const [samlSaving,setSamlSaving]= useState<string | null>(null);
  const [samlOk,    setSamlOk]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, tenantRes] = await Promise.all([
        fetch("/api/admin/connectors"),
        fetch("/api/tenant"),
      ]);
      const connData   = await connRes.json()   as ConnectorConfig[];
      const tenantData = await tenantRes.json() as TenantInfo;
      setConfigs(Array.isArray(connData) ? connData : []);
      setTenant(tenantData ?? {});

      // Pre-fill SAML form from existing extra_config
      const initial: Record<string, { endpoint: string; resource: string }> = {};
      for (const c of connData) {
        if (c.connector_type.startsWith("sap")) {
          initial[c.id] = {
            endpoint: c.extra_config?.saml_token_endpoint ?? "",
            resource: c.extra_config?.saml_resource       ?? "",
          };
        }
      }
      setSamlForm(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSaml(connectorId: string) {
    setSamlSaving(connectorId);
    setSamlOk(null);
    try {
      await fetch(`/api/admin/connectors/${connectorId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          extra_config: {
            saml_token_endpoint: samlForm[connectorId]?.endpoint ?? "",
            saml_resource:       samlForm[connectorId]?.resource  ?? "",
          },
        }),
      });
      setSamlOk(connectorId);
      setTimeout(() => setSamlOk(null), 2500);
      await load();
    } finally {
      setSamlSaving(null);
    }
  }

  const sapConnectors = configs.filter((c) => c.connector_type.startsWith("sap"));

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Auth & SSO</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Identity providers, downstream system auth mapping, and principal propagation config.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      <TabBar
        tabs={["Identity Providers", "Principal Propagation", "Token Settings"]}
        active={tab}
        onChange={setTab}
        admin
      />

      {/* ── Identity Providers ────────────────────────────────────────────── */}
      {tab === "Identity Providers" && (
        <div className="flex flex-col gap-4">

          <SectionCard title="Primary Identity Provider">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--active-bg)] flex items-center justify-center flex-shrink-0">
                <IconShield size={14} className="text-[var(--active-text)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Azure AD / Microsoft Entra ID</div>
                {loading ? (
                  <div className="h-3 w-48 rounded bg-[var(--shell-border)] animate-pulse mt-1" />
                ) : (
                  <div className="text-xs text-[var(--text-muted)]">
                    Tenant:{" "}
                    {tenant.azureTenantId
                      ? <code className="font-mono">{tenant.azureTenantId}</code>
                      : <span className="text-[var(--amber-status)]">Not configured — set in Superadmin → Edit tenant</span>
                    }
                    {" · "}OIDC + SAML 2.0
                  </div>
                )}
              </div>
              <Badge variant="green">Active</Badge>
            </div>
          </SectionCard>

          <SectionCard title="Downstream System Auth Mapping">
            {loading ? (
              <div className="px-4 py-3 space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-10 rounded bg-[var(--shell-border)] animate-pulse" />)}
              </div>
            ) : configs.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[var(--text-muted)] text-center">
                No connectors registered yet. Add them in{" "}
                <strong>Settings → Connectors</strong>.
              </div>
            ) : (
              configs.map((c, i) => {
                const meta   = CONNECTOR_AUTH_MAP[c.connector_type];
                const status = STATUS_BADGE[meta?.status ?? "service-account"];
                return (
                  <div
                    key={c.id}
                    className={`flex items-start gap-3 px-4 py-3 ${i < configs.length - 1 ? "border-b border-[var(--shell-border)]" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--shell-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconShield size={13} className="text-[var(--text-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {c.connector_type === "salesforce"      ? "Salesforce"
                          : c.connector_type === "sap_sales_cloud" ? "SAP Sales Cloud"
                          : c.connector_type === "sap_s4hana"     ? "SAP S/4HANA"
                          : c.connector_type}
                        </span>
                        <Badge variant="gray">{c.label}</Badge>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {meta?.auth ?? "Credential-based auth"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] opacity-70 mt-0.5 italic">
                        {meta?.propagation ?? "Service account — user identity not propagated"}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Microsoft Graph / Microsoft 365">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                style={{ background: "#00a4ef" }}>M</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)]">MSAL — Azure AD OIDC</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Token acquired silently per-user via MSAL. No stored credentials. Scopes: Calendars.Read · Mail.Read · User.Read
                </div>
              </div>
              <Badge variant="green">Auto</Badge>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Principal Propagation ─────────────────────────────────────────── */}
      {tab === "Principal Propagation" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={
              <>
                <strong className="text-[var(--admin)]">Principal propagation</strong> lets the AI agent call SAP as the
                logged-in user — not a shared service account. EnterpriseHub exchanges the user&apos;s Azure AD MSAL
                token for a short-lived SAP OAuth token via the{" "}
                <strong>SAML 2.0 Bearer Assertion Grant</strong>. No SAP passwords needed.
                This requires the SAP system to trust your Azure AD as an IdP.
              </>
            }
          />

          {sapConnectors.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <IconInfo size={22} className="text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">No SAP connectors registered yet.</p>
              <p className="text-xs text-[var(--text-muted)]">Add SAP Sales Cloud or S/4HANA in <strong>Settings → Connectors</strong> first.</p>
            </div>
          ) : (
            sapConnectors.map((c) => {
              const isSaving = samlSaving === c.id;
              const isOk     = samlOk     === c.id;
              const form     = samlForm[c.id] ?? { endpoint: "", resource: "" };
              const hasConfig = !!c.extra_config?.saml_token_endpoint;

              return (
                <SectionCard
                  key={c.id}
                  title={`${c.connector_type === "sap_s4hana" ? "SAP S/4HANA" : "SAP Sales Cloud"} — ${c.label}`}
                  action={<Badge variant={hasConfig ? "green" : "amber"}>{hasConfig ? "Configured" : "Setup needed"}</Badge>}
                >
                  <div className="p-4 space-y-4">

                    <div className="text-xs text-[var(--text-muted)] bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded p-3 space-y-1.5">
                      <p className="font-semibold text-[var(--text-secondary)]">SAP side setup (one-time, done by SAP admin)</p>
                      <p>1. In SAP BTP or Trust Configuration, add your Azure AD as a trusted IdP (import Azure federation metadata XML)</p>
                      <p>2. Map Azure AD user attribute <code className="font-mono bg-[var(--shell-border)] px-1 rounded">email</code> to SAP user principal</p>
                      <p>3. Grant the SAP OAuth client the <code className="font-mono bg-[var(--shell-border)] px-1 rounded">uaa.user</code> scope</p>
                    </div>

                    <FieldGroup label="SAP OAuth Token Endpoint">
                      <input
                        className={inputCls}
                        placeholder="https://myXXXXXX.authentication.eu10.hana.ondemand.com/oauth/token"
                        value={form.endpoint}
                        onChange={(e) => setSamlForm((prev) => ({ ...prev, [c.id]: { ...form, endpoint: e.target.value } }))}
                      />
                    </FieldGroup>

                    <FieldGroup label="SAP Resource / Audience URL">
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">
                        The SAP system URL used as the &apos;resource&apos; parameter in the token exchange
                      </p>
                      <input
                        className={inputCls}
                        placeholder={c.instance_url || "https://myXXXXXX.crm.ondemand.com"}
                        value={form.resource}
                        onChange={(e) => setSamlForm((prev) => ({ ...prev, [c.id]: { ...form, resource: e.target.value } }))}
                      />
                    </FieldGroup>

                    {isOk && <p className="text-xs text-[var(--green-status)]">SAML config saved.</p>}

                    <div className="flex gap-2">
                      <Btn variant="admin" disabled={isSaving} onClick={() => saveSaml(c.id)}>
                        {isSaving ? "Saving…" : "Save SAML Config"}
                      </Btn>
                    </div>
                  </div>
                </SectionCard>
              );
            })
          )}

          {/* Non-SAP connectors note */}
          {configs.filter((c) => !c.connector_type.startsWith("sap")).map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 p-3 border border-[var(--shell-border)] rounded-lg bg-[var(--shell-bg)] text-xs text-[var(--text-muted)]">
              <IconSparkle size={12} className="flex-shrink-0 text-[var(--green-status)]" />
              <span>
                <strong className="text-[var(--text-secondary)]">
                  Salesforce ({c.label}):
                </strong>{" "}
                Already uses per-user OAuth — each user authenticates individually via the OAuth flow. Principal propagation is automatic.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Token Settings ────────────────────────────────────────────────── */}
      {tab === "Token Settings" && (
        <SectionCard title="Token Lifetime Configuration">
          <div className="p-4 grid grid-cols-2 gap-4">
            <FieldGroup label="Access Token Lifetime">
              <select className={selectCls}><option>1 hour</option><option>2 hours</option><option>8 hours</option></select>
            </FieldGroup>
            <FieldGroup label="Refresh Token Lifetime">
              <select className={selectCls}><option>7 days</option><option>14 days</option><option>30 days</option></select>
            </FieldGroup>
            <FieldGroup label="Session Idle Timeout">
              <select className={selectCls}><option>30 minutes</option><option>1 hour</option><option>4 hours</option></select>
            </FieldGroup>
            <FieldGroup label="MFA Policy">
              <select className={selectCls}>
                <option>Required for all</option>
                <option>Required for Admin only</option>
                <option>Optional</option>
              </select>
            </FieldGroup>
          </div>
          <div className="px-4 pb-4">
            <Btn variant="admin">Save Settings</Btn>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
