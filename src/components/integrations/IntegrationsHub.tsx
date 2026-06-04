"use client";

/**
 * IntegrationsHub — unified integration management page.
 *
 * Card grid of all integrations (filtered by category).
 * Right-side drawer with per-integration config + show-in-nav toggle.
 * Multi-tenant: all state saved to /api/integrations per tenant slug.
 */

import { useState, useEffect, useCallback }    from "react";
import { motion, AnimatePresence }             from "framer-motion";
import AppIcon                                 from "@/components/AppIcon";
import { useRoles }                            from "@/contexts/RolesContext";
import { INTEGRATIONS, CATEGORY_ORDER }        from "@/lib/integrations/registry";
import type { IntegrationDef }                 from "@/lib/integrations/types";
import type { IntegrationState, IntegrationStatus, IntegrationView } from "@/lib/integrations/types";

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_DOT: Record<IntegrationStatus, string> = {
  connected:      "#22C55E",
  error:          "#ef4444",
  not_configured: "#9ca3af",
  always_on:      "#3B82F6",
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected:      "Connected",
  error:          "Error",
  not_configured: "Not configured",
  always_on:      "Always active",
};

// ─── Small components ─────────────────────────────────────────────────────────

function IntegrationLogo({ def, size = 36 }: { def: IntegrationDef; size?: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: def.color + "18", border: `1px solid ${def.color}30` }}
    >
      <AppIcon slug={def.logo} color={def.color} size={Math.round(size * 0.55)} />
    </div>
  );
}

function StatusDot({ status, size = 8 }: { status: IntegrationStatus; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, background: STATUS_DOT[status] }}
    />
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
        on ? "bg-[var(--ink)]" : "bg-[var(--shell-border)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Integration card ─────────────────────────────────────────────────────────

function IntegrationCard({
  view,
  onClick,
  index,
}: {
  view:    IntegrationView;
  onClick: () => void;
  index:   number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: "easeOut" }}
      onClick={onClick}
      className="text-left w-full group relative overflow-hidden transition-all duration-150"
      style={{
        border:     "1px solid var(--shell-border)",
        background: "var(--shell-surface)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = view.color + "80";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--shell-border)";
      }}
    >
      {/* Left accent bar */}
      {view.status === "connected" || view.status === "always_on" ? (
        <div className="absolute top-0 left-0 bottom-0 w-[3px]" style={{ background: view.color }} />
      ) : null}

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <IntegrationLogo def={view} size={34} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
              {view.name}
            </p>
            {view.aiContext && (
              <span
                className="font-mono text-[9px] tracking-widest uppercase mt-0.5 inline-block"
                style={{ color: "var(--blue)" }}
              >
                ⬡ Hub AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <StatusDot status={view.status} />
            {view.show_in_nav && (
              <span
                className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Nav
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          className="text-[12px] leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {view.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            {STATUS_LABEL[view.status]}
          </span>
          <span
            className="font-mono text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--ink)" }}
          >
            Configure →
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Config form fields ────────────────────────────────────────────────────────

const fieldCls =
  "w-full px-3 py-2 text-sm font-mono border bg-[var(--paper)] text-[var(--ink)] focus:outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]";
const fieldStyle = { border: "1px solid var(--shell-border)" };

// ─── Drawer ────────────────────────────────────────────────────────────────────

function IntegrationDrawer({
  view,
  onClose,
  onSave,
  isAdmin,
}: {
  view:    IntegrationView;
  onClose: () => void;
  onSave:  (patch: Partial<IntegrationState> & { config?: Record<string, unknown> }) => Promise<void>;
  isAdmin: boolean;
}) {
  const [showInNav, setShowInNav] = useState(view.show_in_nav);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // MCP / API form state
  const [mcpUrl,      setMcpUrl]      = useState("");
  const [mcpToken,    setMcpToken]    = useState("");
  const [apiUrl,      setApiUrl]      = useState(view.instance_url ?? "");
  const [apiUser,     setApiUser]     = useState("");
  const [apiPass,     setApiPass]     = useState("");
  const [apiKey,      setApiKey]      = useState("");
  const [oauthUrl,    setOauthUrl]    = useState(view.instance_url ?? "");
  const [clientId,    setClientId]    = useState("");
  const [clientSecret,setClientSecret]= useState("");

  const isDirty = showInNav !== view.show_in_nav ||
    mcpUrl || mcpToken || apiUser || apiPass || apiKey || clientId || clientSecret;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const patch: Partial<IntegrationState> & { config?: Record<string, unknown> } = {
        show_in_nav: showInNav,
      };

      // Build config payload based on type
      if (view.configType === "shared-org-mcp" && mcpUrl) {
        patch.config = { mcp_url: mcpUrl, instance_url: mcpUrl };
        patch.instance_url = mcpUrl;
        patch.status  = "connected";
        patch.enabled      = true;
      } else if (view.configType === "shared-org-api" && apiUrl && (apiUser || apiKey)) {
        // For SAP / Salesforce types — POST to existing connector_configs endpoint
        if (view.legacyConnectorType) {
          await fetch("/api/admin/connectors", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              connector_type: view.legacyConnectorType,
              label:          "Production",
              instance_url:   apiUrl,
              client_id:      apiUser || apiKey,
              client_secret:  apiPass || "(api-key)",
            }),
          });
        }
        patch.instance_url = apiUrl;
        patch.status  = "connected";
        patch.enabled      = true;
      } else if (view.configType === "shared-org-oauth" && oauthUrl && clientId && clientSecret) {
        if (view.legacyConnectorType) {
          await fetch("/api/admin/connectors", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              connector_type: view.legacyConnectorType,
              label:          "Production",
              instance_url:   oauthUrl,
              client_id:      clientId,
              client_secret:  clientSecret,
            }),
          });
        }
        patch.instance_url = oauthUrl;
        patch.status  = "connected";
        patch.enabled      = true;
      }

      await onSave(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 400, damping: 38 }}
      className="fixed top-14 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
      style={{
        width:      "min(420px, 100vw)",
        background: "var(--paper)",
        borderLeft: "1px solid var(--shell-border)",
        boxShadow:  "-4px 0 24px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--shell-border)" }}
      >
        <IntegrationLogo def={view} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-tight" style={{ color: "var(--ink)" }}>
            {view.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusDot status={view.status} size={6} />
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              {STATUS_LABEL[view.status]}
            </span>
            {view.aiContext && (
              <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                style={{ background: "var(--blue)" + "18", color: "var(--blue)", border: `1px solid var(--blue)30` }}>
                ⬡ Hub AI
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        {/* Description */}
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {view.description}
        </p>

        {/* ── Always-on ──────────────────────────────────────────────────── */}
        {view.configType === "always-on" && (
          <div
            className="p-4"
            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <StatusDot status="always_on" size={8} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                Active via Azure AD
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              No configuration required. This integration is automatically available to all authenticated users.
            </p>
            {view.scopes && (
              <div className="mt-3 flex flex-wrap gap-1">
                {view.scopes.map((s) => (
                  <span key={s} className="font-mono text-[10px] px-2 py-0.5"
                    style={{ background: "var(--paper)", border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Personal OAuth (Teams) ─────────────────────────────────────── */}
        {view.configType === "personal-oauth" && (
          <div
            className="p-4"
            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)" }}
          >
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
              Per-user connection
            </p>
            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
              Each team member connects their own account. Grant access in{" "}
              <strong>Settings → Connections</strong>.
            </p>
            <a
              href="/dashboard/settings?tab=connections"
              className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 inline-block transition-opacity hover:opacity-80"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              Open Settings →
            </a>
            {view.scopes && (
              <div className="mt-4">
                <p className="font-mono text-[10px] tracking-widest uppercase mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Permissions requested
                </p>
                <div className="flex flex-wrap gap-1">
                  {view.scopes.map((s) => (
                    <span key={s} className="font-mono text-[10px] px-2 py-0.5"
                      style={{ background: "var(--paper)", border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Personal credentials (IMAP, CalDAV) ──────────────────────── */}
        {view.configType === "personal-credentials" && (
          <div
            className="p-4"
            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)" }}
          >
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
              Per-user connection
            </p>
            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
              Each team member enters their own credentials. Configure in{" "}
              <strong>Settings → Connections</strong>.
            </p>
            <a
              href="/dashboard/settings?tab=connections"
              className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 inline-block transition-opacity hover:opacity-80"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              Open Settings →
            </a>
            {view.authHint && (
              <p className="font-mono text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
                Auth: {view.authHint}
              </p>
            )}
          </div>
        )}

        {/* ── App link ──────────────────────────────────────────────────── */}
        {view.configType === "app-link" && view.appUrl && (
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase mb-1.5" style={{ color: "var(--text-muted)" }}>
              App URL
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={view.appUrl}
                className={`${fieldCls} flex-1 text-[11px]`}
                style={fieldStyle}
              />
              <a
                href={view.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] tracking-widest uppercase px-3 py-2 transition-opacity hover:opacity-80 flex-shrink-0 flex items-center gap-1"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Open ↗
              </a>
            </div>
          </div>
        )}

        {/* ── Shared org — MCP Server ───────────────────────────────────── */}
        {view.configType === "shared-org-mcp" && isAdmin && (
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                MCP Server URL
              </label>
              <input
                type="url"
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                placeholder="https://mcp.your-instance.com"
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Bearer Token
              </label>
              <input
                type="password"
                value={mcpToken}
                onChange={(e) => setMcpToken(e.target.value)}
                placeholder="••••••••••••"
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
            <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
              Token stored server-side — never exposed to the browser.
            </p>
          </div>
        )}

        {/* ── Shared org — API / Basic Auth ─────────────────────────────── */}
        {view.configType === "shared-org-api" && isAdmin && (
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Instance URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-instance.example.com"
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {view.id.startsWith("aws") || view.id === "gcp" ? "Access Key ID" : "Username / API Key"}
                </label>
                <input
                  type="text"
                  value={apiUser}
                  onChange={(e) => setApiUser(e.target.value)}
                  placeholder={view.id.startsWith("aws") ? "AKIA…" : "api.user@company.com"}
                  autoComplete="username"
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {view.id.startsWith("aws") || view.id === "gcp" ? "Secret Access Key" : "Password / Secret"}
                </label>
                <input
                  type="password"
                  value={apiPass}
                  onChange={(e) => setApiPass(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
            </div>
            {view.authHint && (
              <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Auth: {view.authHint}
              </p>
            )}
          </div>
        )}

        {/* ── Shared org — OAuth ────────────────────────────────────────── */}
        {view.configType === "shared-org-oauth" && isAdmin && (
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                Instance URL
              </label>
              <input
                type="url"
                value={oauthUrl}
                onChange={(e) => setOauthUrl(e.target.value)}
                placeholder="https://yourorg.my.salesforce.com"
                className={fieldCls}
                style={fieldStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="3MVG9…"
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="off"
                  className={fieldCls}
                  style={fieldStyle}
                />
              </div>
            </div>
            {view.authHint && (
              <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Auth: {view.authHint}
              </p>
            )}
          </div>
        )}

        {/* ── Read-only: non-admin, shared config types ─────────────────── */}
        {(view.configType === "shared-org-api" || view.configType === "shared-org-oauth" || view.configType === "shared-org-mcp") && !isAdmin && (
          <div
            className="p-4"
            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)" }}
          >
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Configured by your workspace admin.
              {view.instance_url && (
                <> Instance: <span className="font-mono">{view.instance_url}</span></>
              )}
            </p>
          </div>
        )}

        {/* ── Show in sidebar toggle (all types) ────────────────────────── */}
        {view.configType !== "always-on" && (
          <div
            className="flex items-center justify-between p-4"
            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)" }}
          >
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                Show in sidebar
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {view.appUrl
                  ? "Adds a quick-launch link to the navigation sidebar."
                  : "Adds this integration to the sidebar so users know it is active."}
              </p>
            </div>
            <Toggle
              on={showInNav}
              onChange={setShowInNav}
              disabled={!isAdmin && (view.configType === "shared-org-api" || view.configType === "shared-org-oauth" || view.configType === "shared-org-mcp")}
            />
          </div>
        )}

        {/* ── Docs link ─────────────────────────────────────────────────── */}
        {view.docsUrl && (
          <a
            href={view.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-widest uppercase flex items-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 10L10 2M6 2h4v4M10 7v3H2V4h3" />
            </svg>
            Documentation ↗
          </a>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between gap-2 px-5 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid var(--shell-border)" }}
      >
        <button
          onClick={onClose}
          className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-60"
          style={{ border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
        >
          Close
        </button>

        {(view.configType !== "always-on" && view.configType !== "personal-oauth" && view.configType !== "personal-credentials") && (
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="font-mono text-[11px] tracking-widest uppercase px-5 py-2 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: saved ? "#22C55E" : "var(--ink)", color: "var(--paper)" }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main hub ──────────────────────────────────────────────────────────────────

export default function IntegrationsHub() {
  const { isAdmin, isManager } = useRoles();
  const canConfigure = isAdmin || isManager;

  const [states,      setStates]      = useState<Map<string, IntegrationState>>(new Map());
  const [loading,     setLoading]     = useState(true);
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [activeFilter,setActiveFilter]= useState<string>("All");

  // Fetch states from API
  const fetchStates = useCallback(async () => {
    try {
      const res  = await fetch("/api/integrations");
      const data = await res.json() as IntegrationState[];
      if (Array.isArray(data)) {
        setStates(new Map(data.map((s) => [s.integration_id, s])));
      }
    } catch { /* keep existing */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStates(); }, [fetchStates]);

  // Merge registry + state
  const views: IntegrationView[] = INTEGRATIONS.map((def) => {
    const state = states.get(def.id);
    return {
      ...def,
      integration_id: def.id,
      enabled:        state?.enabled      ?? (def.configType === "always-on"),
      show_in_nav:    state?.show_in_nav  ?? false,
      nav_label:      state?.nav_label,
      status:         state?.status       ?? (def.configType === "always-on" ? "always_on" : "not_configured"),
      instance_url:   state?.instance_url,
      last_tested_at: state?.last_tested_at,
    };
  });

  // Category filter
  const categories = ["All", ...CATEGORY_ORDER.filter((c) => views.some((v) => v.category === c))];
  const filtered   = activeFilter === "All" ? views : views.filter((v) => v.category === activeFilter);

  // Grouped
  const grouped = CATEGORY_ORDER.reduce<Record<string, IntegrationView[]>>((acc, cat) => {
    const items = filtered.filter((v) => v.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const activeView = activeId ? views.find((v) => v.id === activeId) ?? null : null;

  async function handleSave(patch: Partial<IntegrationState> & { config?: Record<string, unknown> }) {
    if (!activeId) return;
    try {
      await fetch("/api/integrations", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ integration_id: activeId, ...patch }),
      });
      // Optimistic update
      setStates((prev) => {
        const next = new Map(prev);
        const existing = next.get(activeId) ?? {
          integration_id: activeId, enabled: false, show_in_nav: false, status: "not_configured" as IntegrationStatus,
        };
        next.set(activeId, { ...existing, ...patch });
        return next;
      });
    } catch { /* toast error in prod */ }
  }

  // Summary stats
  const connected = views.filter((v) => v.status === "connected" || v.status === "always_on").length;
  const aiSources = views.filter((v) => v.aiContext && (v.status === "connected" || v.status === "always_on")).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 py-6"
        style={{ marginRight: activeView ? "min(420px, 100vw)" : undefined, transition: "margin 0.3s ease" }}
      >

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            ⬡ Enterprise Hub
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>
                Integrations
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                One place to connect, configure, and control every system Enterprise Hub touches.
              </p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>{connected}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Connected</p>
              </div>
              <div style={{ borderLeft: "1px solid var(--shell-border)", paddingLeft: 16 }}>
                <p className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--blue)" }}>{aiSources}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Powering AI</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category filter bar */}
        <div
          className="flex items-center gap-1.5 flex-wrap mb-6 pb-4"
          style={{ borderBottom: "1px solid var(--shell-border)" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 transition-all"
              style={
                activeFilter === cat
                  ? { background: "var(--ink)", color: "var(--paper)" }
                  : { border: "1px solid var(--shell-border)", color: "var(--text-muted)", background: "transparent" }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Card grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse" style={{ background: "var(--shell-border)" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--text-muted)" }}>
                    {category}
                  </p>
                  {category === "AI Data Sources" && (
                    <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                      style={{ background: "var(--blue)" + "15", color: "var(--blue)", border: "1px solid var(--blue)30" }}>
                      Powers Hub AI
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((view, i) => (
                    <IntegrationCard
                      key={view.id}
                      view={view}
                      index={i}
                      onClick={() => setActiveId(view.id === activeId ? null : view.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-6 text-center"
          style={{ borderTop: "1px solid var(--shell-border)" }}
        >
          <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            All credentials stored server-side, scoped per tenant · MCP architecture · EU AI Act ready
          </p>
        </motion.div>

      </div>

      {/* Drawer overlay */}
      <AnimatePresence>
        {activeView && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.3)" }}
              onClick={() => setActiveId(null)}
            />
            <IntegrationDrawer
              key={activeId}
              view={activeView}
              onClose={() => setActiveId(null)}
              onSave={handleSave}
              isAdmin={canConfigure}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
