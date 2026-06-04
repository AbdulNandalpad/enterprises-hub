"use client";

import { useState, useEffect, useCallback }  from "react";
import { motion, AnimatePresence }            from "framer-motion";
import AppIcon                               from "@/components/AppIcon";
import { useRoles }                          from "@/contexts/RolesContext";
import { INTEGRATIONS, CATEGORY_ORDER }      from "@/lib/integrations/registry";
import type { IntegrationDef, IntegrationState, IntegrationStatus, IntegrationView } from "@/lib/integrations/types";

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<IntegrationStatus, string> = {
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

// ─── Primitives ───────────────────────────────────────────────────────────────

function Logo({ def, size = 32 }: { def: IntegrationDef; size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width:      size,
        height:     size,
        background: def.color + "15",
        border:     `1px solid ${def.color}25`,
      }}
    >
      <AppIcon slug={def.logo} color={def.color} size={Math.round(size * 0.52)} />
    </div>
  );
}

function Dot({ status }: { status: IntegrationStatus }) {
  return (
    <span
      className="rounded-full inline-block flex-shrink-0"
      style={{ width: 7, height: 7, background: STATUS_COLOR[status] }}
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
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-40 ${
        on ? "bg-[var(--ink)]" : "bg-[var(--shell-border)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 12 12" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-200 flex-shrink-0"
      style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function IntegrationCard({ view, active, onClick, index }: {
  view:    IntegrationView;
  active:  boolean;
  onClick: () => void;
  index:   number;
}) {
  const isLive = view.status === "connected" || view.status === "always_on";

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.025, duration: 0.25, ease: "easeOut" }}
      onClick={onClick}
      className="text-left w-full transition-all duration-150 flex flex-col"
      style={{
        border:     active
          ? `1px solid ${view.color}90`
          : "1px solid var(--shell-border)",
        background: active ? view.color + "06" : "var(--shell-surface)",
        minHeight:  120,
      }}
    >
      {/* Accent top bar — only when active/connected */}
      {isLive && (
        <div className="h-[2px] w-full flex-shrink-0" style={{ background: view.color }} />
      )}

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Row 1: logo + name + status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo def={view} size={30} />
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold truncate leading-snug"
              style={{ color: "var(--ink)" }}
            >
              {view.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Dot status={view.status} />
              <span
                className="font-mono text-[10px] truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {STATUS_LABEL[view.status]}
              </span>
              {view.show_in_nav && (
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-1 py-px flex-shrink-0"
                  style={{ background: "var(--ink)", color: "var(--paper)" }}
                >
                  Nav
                </span>
              )}
            </div>
          </div>
          {view.aiContext && (
            <span
              className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 flex-shrink-0 hidden sm:inline"
              style={{ color: "var(--blue)", border: `1px solid ${`var(--blue)`}30`, background: "var(--blue)" + "10" }}
            >
              AI
            </span>
          )}
        </div>

        {/* Row 2: description */}
        <p
          className="text-[12px] leading-relaxed flex-1"
          style={{
            color:             "var(--text-secondary)",
            display:           "-webkit-box",
            WebkitLineClamp:   2,
            WebkitBoxOrient:   "vertical",
            overflow:          "hidden",
          }}
        >
          {view.description}
        </p>

        {/* Row 3: configure hint */}
        <p
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: active ? view.color : "var(--text-muted)" }}
        >
          {active ? "Configuring ↗" : "Configure →"}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────

const iCls = [
  "w-full px-3 py-2 text-[13px] font-mono",
  "border bg-[var(--paper)] text-[var(--ink)]",
  "focus:outline-none transition-colors",
  "placeholder:text-[var(--text-muted)]",
  "focus:border-[var(--ink)]",
].join(" ");
const iStyle = { border: "1px solid var(--shell-border)" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="font-mono text-[10px] tracking-widest uppercase block mb-1.5"
        style={{ color: "rgba(255,255,255,0.40)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function Drawer({ view, onClose, onSave, isAdmin }: {
  view:    IntegrationView;
  onClose: () => void;
  onSave:  (patch: Partial<IntegrationState> & { config?: Record<string, unknown> }) => Promise<void>;
  isAdmin: boolean;
}) {
  const [showInNav,    setShowInNav]    = useState(view.show_in_nav);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [mcpUrl,       setMcpUrl]       = useState("");
  const [mcpToken,     setMcpToken]     = useState("");
  const [apiUrl,       setApiUrl]       = useState(view.instance_url ?? "");
  const [apiUser,      setApiUser]      = useState("");
  const [apiPass,      setApiPass]      = useState("");
  const [oauthUrl,     setOauthUrl]     = useState(view.instance_url ?? "");
  const [clientId,     setClientId]     = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const isSharedConfig = ["shared-org-oauth", "shared-org-api", "shared-org-mcp"].includes(view.configType);
  const hasCredentials = mcpUrl || mcpToken || apiUser || apiPass || clientId || clientSecret;
  const isDirty = showInNav !== view.show_in_nav || hasCredentials;

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<IntegrationState> & { config?: Record<string, unknown> } = {
        show_in_nav: showInNav,
      };
      if (view.configType === "shared-org-mcp" && mcpUrl) {
        patch.config       = { mcp_url: mcpUrl };
        patch.instance_url = mcpUrl;
        patch.status       = "connected";
        patch.enabled      = true;
      } else if (view.configType === "shared-org-api" && apiUrl && (apiUser || apiPass)) {
        if (view.legacyConnectorType) {
          await fetch("/api/admin/connectors", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              connector_type: view.legacyConnectorType,
              label:          "Production",
              instance_url:   apiUrl,
              client_id:      apiUser,
              client_secret:  apiPass,
            }),
          });
        }
        patch.instance_url = apiUrl;
        patch.status       = "connected";
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
        patch.status       = "connected";
        patch.enabled      = true;
      }
      await onSave(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ── Full-screen overlay — backdrop + centering container ── */}
      {/* pointer-events on the outer div handle backdrop clicks    */}
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.82)" }}
        onClick={onClose}
      >
        {/* Modal panel — stop click propagation so it doesn't close itself */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col w-full"
          style={{
            maxWidth:  560,
            maxHeight: "min(700px, calc(100vh - 80px))",
            background: "var(--ink)",
            border:     "1px solid rgba(255,255,255,0.14)",
            boxShadow:  "0 32px 100px rgba(0,0,0,0.90)",
          }}
        >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 sm:px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          <Logo def={view} size={34} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] truncate" style={{ color: "var(--paper)" }}>
              {view.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Dot status={view.status} />
              <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {STATUS_LABEL[view.status]}
              </span>
              {view.aiContext && (
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-px"
                  style={{ color: "#93C5FD", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}
                >
                  ⬡ Hub AI
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 transition-opacity hover:opacity-50 flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5">

          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
            {view.description}
          </p>

          {/* ── Always-on ──────────────────────────────────────────────── */}
          {view.configType === "always-on" && (
            <div className="p-4 space-y-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="flex items-center gap-2">
                <Dot status="always_on" />
                <span className="text-[13px] font-semibold" style={{ color: "var(--paper)" }}>
                  Active via Azure AD
                </span>
              </div>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                No configuration required. Automatically available for all authenticated users.
              </p>
              {view.scopes && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {view.scopes.map((s) => (
                    <span key={s} className="font-mono text-[10px] px-2 py-0.5"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Personal OAuth (Teams) ─────────────────────────────────── */}
          {view.configType === "personal-oauth" && (
            <div className="p-4 space-y-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--paper)" }}>Per-user connection</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Each team member connects their own account in <strong>Settings → Connections</strong>.
              </p>
              <a href="/dashboard/settings"
                className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 inline-block transition-opacity hover:opacity-80"
                style={{ background: "var(--paper)", color: "var(--ink)" }}>
                Open Settings →
              </a>
              {view.scopes && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {view.scopes.map((s) => (
                    <span key={s} className="font-mono text-[10px] px-2 py-0.5"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Personal credentials (IMAP, CalDAV) ──────────────────── */}
          {view.configType === "personal-credentials" && (
            <div className="p-4 space-y-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--paper)" }}>Per-user connection</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Each team member enters their own credentials in <strong>Settings → Connections</strong>.
              </p>
              <a href="/dashboard/settings"
                className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 inline-block transition-opacity hover:opacity-80"
                style={{ background: "var(--paper)", color: "var(--ink)" }}>
                Open Settings →
              </a>
            </div>
          )}

          {/* ── App link ──────────────────────────────────────────────── */}
          {view.configType === "app-link" && view.appUrl && (
            <Field label="App URL">
              <div className="flex gap-2">
                <input readOnly value={view.appUrl} className="flex-1 text-[11px] w-full px-3 py-2 font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.70)" }} />
                <a href={view.appUrl} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[11px] tracking-widest uppercase px-3 py-2 flex-shrink-0 transition-opacity hover:opacity-80"
                  style={{ background: "var(--paper)", color: "var(--ink)" }}>
                  Open ↗
                </a>
              </div>
            </Field>
          )}

          {/* ── Shared — MCP ──────────────────────────────────────────── */}
          {view.configType === "shared-org-mcp" && isAdmin && (
            <div className="space-y-3">
              <Field label="MCP Server URL">
                <input type="url" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://mcp.your-instance.com" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
              </Field>
              <Field label="Bearer Token">
                <input type="password" value={mcpToken} onChange={(e) => setMcpToken(e.target.value)}
                  placeholder="••••••••••••" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
              </Field>
              <p className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Stored server-side only — never exposed to the browser.
              </p>
            </div>
          )}

          {/* ── Shared — API / Basic ──────────────────────────────────── */}
          {view.configType === "shared-org-api" && isAdmin && (
            <div className="space-y-3">
              <Field label="Instance URL">
                <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-instance.example.com" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username / Access Key">
                  <input type="text" value={apiUser} onChange={(e) => setApiUser(e.target.value)}
                    placeholder="api.user@company.com" autoComplete="username" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
                </Field>
                <Field label="Password / Secret">
                  <input type="password" value={apiPass} onChange={(e) => setApiPass(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
                </Field>
              </div>
              {view.authHint && (
                <p className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>Auth: {view.authHint}</p>
              )}
            </div>
          )}

          {/* ── Shared — OAuth ────────────────────────────────────────── */}
          {view.configType === "shared-org-oauth" && isAdmin && (
            <div className="space-y-3">
              <Field label="Instance URL">
                <input type="url" value={oauthUrl} onChange={(e) => setOauthUrl(e.target.value)}
                  placeholder="https://yourorg.my.salesforce.com" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client ID">
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)}
                    placeholder="3MVG9…" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
                </Field>
                <Field label="Client Secret">
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="••••••••" autoComplete="off" className="w-full px-3 py-2 text-[13px] font-mono focus:outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "var(--paper)" }} />
                </Field>
              </div>
              {view.authHint && (
                <p className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>Auth: {view.authHint}</p>
              )}
            </div>
          )}

          {/* ── Non-admin read-only notice ─────────────────────────────── */}
          {isSharedConfig && !isAdmin && (
            <div className="p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Configured by your workspace admin.
                {view.instance_url && <> Instance: <span className="font-mono">{view.instance_url}</span></>}
              </p>
            </div>
          )}

          {/* ── Show in sidebar toggle ─────────────────────────────────── */}
          {view.configType !== "always-on" && (
            <div className="flex items-center justify-between gap-4 p-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "var(--paper)" }}>Show in sidebar</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {view.appUrl ? "Quick-launch link in the navigation sidebar." : "Marks this integration as active in the sidebar."}
                </p>
              </div>
              <Toggle
                on={showInNav}
                onChange={setShowInNav}
                disabled={isSharedConfig && !isAdmin}
              />
            </div>
          )}

          {/* ── Docs ──────────────────────────────────────────────────── */}
          {view.docsUrl && (
            <a href={view.docsUrl} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[10px] tracking-widest uppercase flex items-center gap-1.5 transition-opacity hover:opacity-60"
              style={{ color: "rgba(255,255,255,0.40)" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 10L10 2M6 2h4v4M10 7v3H2V4h3" />
              </svg>
              Documentation ↗
            </a>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <button onClick={onClose}
            className="font-mono text-[11px] tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-60"
            style={{ border: "1px solid rgba(255,255,255,0.20)", color: "rgba(255,255,255,0.55)" }}>
            Close
          </button>
          {view.configType !== "always-on" && view.configType !== "personal-oauth" && view.configType !== "personal-credentials" && (
            <button onClick={handleSave} disabled={saving || !isDirty}
              className="font-mono text-[11px] tracking-widest uppercase px-6 py-2 transition-opacity hover:opacity-90 disabled:opacity-30"
              style={{ background: saved ? "#22C55E" : "var(--paper)", color: saved ? "#fff" : "var(--ink)" }}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          )}
        </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Main hub ──────────────────────────────────────────────────────────────────

// Categories collapsed by default (just AI Data Sources — it's long and takes all space)
const DEFAULT_COLLAPSED = new Set(["AI Data Sources"]);

export default function IntegrationsHub() {
  const { isAdmin, isManager } = useRoles();
  const canConfigure = isAdmin || isManager;

  const [states,     setStates]     = useState<Map<string, IntegrationState>>(new Map());
  const [loading,    setLoading]    = useState(true);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [filter,     setFilter]     = useState("All");
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set(DEFAULT_COLLAPSED));

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
    const s = states.get(def.id);
    return {
      ...def,
      integration_id: def.id,
      enabled:        s?.enabled      ?? (def.configType === "always-on"),
      show_in_nav:    s?.show_in_nav  ?? false,
      nav_label:      s?.nav_label,
      status:         s?.status       ?? (def.configType === "always-on" ? "always_on" : "not_configured"),
      instance_url:   s?.instance_url,
      last_tested_at: s?.last_tested_at,
    };
  });

  const filtered = filter === "All" ? views : views.filter((v) => v.category === filter);

  const grouped = CATEGORY_ORDER.reduce<Record<string, IntegrationView[]>>((acc, cat) => {
    const items = filtered.filter((v) => v.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const categories = ["All", ...CATEGORY_ORDER.filter((c) => views.some((v) => v.category === c))];
  const activeView = activeId ? views.find((v) => v.id === activeId) ?? null : null;

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  async function handleSave(patch: Partial<IntegrationState> & { config?: Record<string, unknown> }) {
    if (!activeId) return;
    await fetch("/api/integrations", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ integration_id: activeId, ...patch }),
    });
    setStates((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeId) ?? {
        integration_id: activeId, enabled: false, show_in_nav: false, status: "not_configured" as IntegrationStatus,
      };
      next.set(activeId, { ...existing, ...patch });
      return next;
    });
  }

  const connected = views.filter((v) => v.status === "connected" || v.status === "always_on").length;
  const aiSources = views.filter((v) => v.aiContext && (v.status === "connected" || v.status === "always_on")).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            ⬡ Enterprise Hub
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>
                Integrations
              </h1>
              <p className="text-[13px] mt-1 max-w-lg" style={{ color: "var(--text-secondary)" }}>
                Connect, configure, and control every system Enterprise Hub touches — in one place.
              </p>
            </div>
            <div className="flex items-center gap-5 sm:text-right flex-shrink-0">
              <div>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--ink)" }}>
                  {connected}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Connected
                </p>
              </div>
              <div className="pl-5" style={{ borderLeft: "1px solid var(--shell-border)" }}>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--blue)" }}>
                  {aiSources}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Powering AI
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-6 pb-5" style={{ borderBottom: "1px solid var(--shell-border)" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 transition-all"
              style={
                filter === cat
                  ? { background: "var(--ink)", color: "var(--paper)" }
                  : { border: "1px solid var(--shell-border)", color: "var(--text-muted)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse" style={{ background: "var(--shell-border)" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => {
              const isOpen = !collapsed.has(category);
              return (
                <div key={category}>
                  {/* Category header — clickable to collapse */}
                  <button
                    onClick={() => toggleCollapse(category)}
                    className="w-full flex items-center gap-2.5 mb-3 group"
                  >
                    <span
                      className="font-mono text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {category}
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ({items.length})
                    </span>
                    {category === "AI Data Sources" && isOpen && (
                      <span
                        className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-px"
                        style={{ color: "var(--blue)", background: "var(--blue)" + "10", border: "1px solid var(--blue)25" }}
                      >
                        Powers Hub AI
                      </span>
                    )}
                    <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
                      <Chevron open={isOpen} />
                    </span>
                    <div
                      className="h-px flex-1 max-w-[1px] opacity-0"
                      style={{ background: "var(--shell-border)" }}
                    />
                  </button>

                  {/* Cards — animate open/close */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="cards"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-1">
                          {items.map((view, i) => (
                            <IntegrationCard
                              key={view.id}
                              view={view}
                              active={view.id === activeId}
                              index={i}
                              onClick={() => setActiveId(view.id === activeId ? null : view.id)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Collapsed summary */}
                  {!isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 pb-1"
                    >
                      <div className="flex gap-1">
                        {items.slice(0, 5).map((v) => (
                          <div
                            key={v.id}
                            className="w-6 h-6 flex items-center justify-center"
                            style={{ background: v.color + "15", border: `1px solid ${v.color}25` }}
                            title={v.name}
                          >
                            <AppIcon slug={v.logo} color={v.color} size={12} />
                          </div>
                        ))}
                        {items.length > 5 && (
                          <div
                            className="w-6 h-6 flex items-center justify-center font-mono text-[9px]"
                            style={{ background: "var(--shell-surface)", border: "1px solid var(--shell-border)", color: "var(--text-muted)" }}
                          >
                            +{items.length - 5}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleCollapse(category)}
                        className="font-mono text-[10px] tracking-widest uppercase transition-opacity hover:opacity-60"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Show all →
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 pt-6 text-center"
          style={{ borderTop: "1px solid var(--shell-border)" }}
        >
          <p className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            All credentials stored server-side, scoped per tenant · MCP-first architecture · EU AI Act ready
          </p>
        </motion.div>

      </div>

      {/* Drawer */}
      <AnimatePresence>
        {activeView && (
          <Drawer
            key={activeId}
            view={activeView}
            onClose={() => setActiveId(null)}
            onSave={handleSave}
            isAdmin={canConfigure}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
