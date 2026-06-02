"use client";

/**
 * SalesforceWidget — multi-org Salesforce CRM widget.
 *
 * 1. Fetches available Salesforce connector configs from /api/admin/connectors?type=salesforce
 * 2. If multiple orgs: shows an org picker (Production / QA / Sandbox)
 * 3. OAuth connect flow goes through the selected org's configId
 * 4. Tokens are stored in httpOnly cookies keyed by configId
 */

import { useState, useEffect, useCallback } from "react";
import { IconTrendingUp, IconDollar, IconUsers, IconArrowRight, IconX } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfig {
  id:             string;
  connector_type: string;
  label:          string;
  instance_url:   string;
}

interface SFOpportunity {
  Id: string; Name: string; StageName: string; Amount: number | null;
  CloseDate: string; AccountName: string | null; Probability: number | null;
}

interface SFContact {
  Id: string; Name: string; Title: string | null;
  Email: string | null; AccountName: string | null;
}

interface SFStats {
  totalOpportunities: number; openOpportunities: number;
  totalPipeline: number; closedWonThisMonth: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function stageBadge(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("closed won"))  return "bg-[var(--green-status)]/15 text-[var(--green-status)]";
  if (s.includes("closed lost")) return "bg-[var(--red-status)]/15 text-[var(--red-status)]";
  if (s.includes("proposal"))    return "bg-[var(--active-bg)] text-[var(--active-text)]";
  return "bg-[var(--shell-border)] text-[var(--text-muted)]";
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg bg-[var(--shell-border)] animate-pulse" />)}
      </div>
      <div className="space-y-2 pt-1">
        {[1,2,3].map((i) => <div key={i} className="h-10 rounded bg-[var(--shell-border)] animate-pulse" />)}
      </div>
    </div>
  );
}

function OrgPicker({ configs, onSelect }: { configs: ConnectorConfig[]; onSelect: (c: ConnectorConfig) => void }) {
  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "#00A1E0" }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="white">
            <path d="M13.3 6.7a6.3 6.3 0 0 1 10.6-3A7.5 7.5 0 0 1 30 11a7.5 7.5 0 0 1-2.5 14.2H7.5A6.3 6.3 0 0 1 6.2 11a6.3 6.3 0 0 1 7.1-4.3z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Select Salesforce Org</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Choose which org to connect</p>
      </div>
      <div className="space-y-2">
        {configs.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--shell-border)] hover:border-[#00A1E0] hover:bg-[var(--active-bg)] transition-all text-left"
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                 style={{ background: "#00A1E0" }}>
              {c.label.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{c.label}</p>
              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{c.instance_url.replace("https://", "")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectPrompt({ config, onConnect }: { config: ConnectorConfig; onConnect: () => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#00A1E0" }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="white">
          <path d="M13.3 6.7a6.3 6.3 0 0 1 10.6-3A7.5 7.5 0 0 1 30 11a7.5 7.5 0 0 1-2.5 14.2H7.5A6.3 6.3 0 0 1 6.2 11a6.3 6.3 0 0 1 7.1-4.3z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Connect {config.label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-[200px] leading-relaxed">
          {config.instance_url.replace("https://", "")}
        </p>
      </div>
      <a
        href={`/api/connectors/salesforce/auth?configId=${config.id}`}
        onClick={onConnect}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "#00A1E0" }}
      >
        Connect via Salesforce SSO
      </a>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function SalesforceWidget() {
  const [configs,   setConfigs]   = useState<ConnectorConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<ConnectorConfig | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [tab,       setTab]       = useState<"opportunities" | "contacts">("opportunities");
  const [stats,     setStats]     = useState<SFStats | null>(null);
  const [opps,      setOpps]      = useState<SFOpportunity[]>([]);
  const [contacts,  setContacts]  = useState<SFContact[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Step 1: load available configs
  useEffect(() => {
    fetch("/api/admin/connectors?type=salesforce")
      .then((r) => r.json())
      .then((data: ConnectorConfig[]) => {
        const list = Array.isArray(data) ? data.filter((c) => c) : [];
        setConfigs(list);
        if (list.length === 1) setActiveConfig(list[0]); // auto-select if only one
      })
      .catch(() => setConfigs([]));
  }, []);

  // Step 2: once we have an active config, check connection + load data
  const loadData = useCallback(async (config: ConnectorConfig) => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch(`/api/connectors/salesforce/status?configId=${config.id}`);
      const { connected: isConn } = await statusRes.json() as { connected: boolean };
      setConnected(isConn);
      if (!isConn) { setLoading(false); return; }

      const [statsRes, oppsRes, contactsRes] = await Promise.all([
        fetch(`/api/connectors/salesforce/data?configId=${config.id}&type=stats`),
        fetch(`/api/connectors/salesforce/data?configId=${config.id}&type=opportunities`),
        fetch(`/api/connectors/salesforce/data?configId=${config.id}&type=contacts`),
      ]);

      if (statsRes.status === 401) { setConnected(false); setLoading(false); return; }

      const [statsData, oppsData, contactsData] = await Promise.all([
        statsRes.json(), oppsRes.json(), contactsRes.json(),
      ]);

      setStats(statsData as SFStats);
      setOpps(Array.isArray(oppsData) ? oppsData as SFOpportunity[] : []);
      setContacts(Array.isArray(contactsData) ? contactsData as SFContact[] : []);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeConfig) loadData(activeConfig);
  }, [activeConfig, loadData]);

  // Handle OAuth callback redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sfConnected = params.get("sf_connected");
    if (sfConnected && activeConfig && sfConnected === activeConfig.id) {
      const url = new URL(window.location.href);
      url.searchParams.delete("sf_connected");
      window.history.replaceState({}, "", url.toString());
      loadData(activeConfig);
    }
  }, [activeConfig, loadData]);

  async function disconnect() {
    if (!activeConfig) return;
    await fetch(`/api/connectors/salesforce/disconnect?configId=${activeConfig.id}`, { method: "POST" });
    setConnected(false);
    setStats(null); setOpps([]); setContacts([]);
  }

  // ── No configs registered ─────────────────────────────────────────────────
  if (!loading && configs.length === 0) {
    return (
      <div className="p-4 text-center space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">No Salesforce org registered</p>
        <p className="text-xs text-[var(--text-muted)]">Ask your admin to add one in Admin → Connectors.</p>
      </div>
    );
  }

  // ── Org picker (multiple configs, none selected) ───────────────────────────
  if (configs.length > 1 && !activeConfig) {
    return <OrgPicker configs={configs} onSelect={(c) => setActiveConfig(c)} />;
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (connected === null || loading) return <Skeleton />;

  // ── Connect prompt ─────────────────────────────────────────────────────────
  if (!connected && activeConfig) {
    return (
      <div>
        {/* Always show which org — "Switch org" only when multiple exist */}
        <div className="flex items-center justify-between px-3 pt-2 pb-0">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Salesforce · {activeConfig.label}
          </span>
          {configs.length > 1 && (
            <button onClick={() => setActiveConfig(null)} className="text-[10px] text-[var(--active-text)] hover:underline">
              Switch org
            </button>
          )}
        </div>
        <ConnectPrompt config={activeConfig} onConnect={() => {}} />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-[var(--red-status)]">{error}</p>
        <button onClick={() => activeConfig && loadData(activeConfig)} className="mt-2 text-xs text-[var(--active-text)] hover:underline">Retry</button>
      </div>
    );
  }

  // ── Connected — main view ──────────────────────────────────────────────────
  return (
    <div>
      {/* Org selector strip — always shown so users know which instance is active */}
      {activeConfig && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--green-status)]" />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Salesforce · {activeConfig.label}
            </span>
          </div>
          {configs.length > 1 && (
            <button onClick={() => setActiveConfig(null)} className="text-[10px] text-[var(--active-text)] hover:underline">
              Switch org
            </button>
          )}
        </div>
      )}

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--shell-border)]">
          <div className="rounded-lg border border-[var(--shell-border)] p-2.5">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Pipeline</p>
            <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
              <IconDollar size={13} className="text-[var(--active-text)]" />
              {fmtCurrency(stats.totalPipeline)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--shell-border)] p-2.5">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Open Deals</p>
            <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
              <IconTrendingUp size={13} className="text-[var(--active-text)]" />
              {stats.openOpportunities}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--shell-border)] p-2.5">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Won This Month</p>
            <p className="text-base font-semibold text-[var(--green-status)] mt-0.5">{stats.closedWonThisMonth}</p>
          </div>
          <div className="rounded-lg border border-[var(--shell-border)] p-2.5">
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Total Opps</p>
            <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">{stats.totalOpportunities}</p>
          </div>
        </div>
      )}

      {/* Tab strip */}
      <div className="flex items-center border-b border-[var(--shell-border)] px-3 pt-1">
        {(["opportunities", "contacts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs font-medium px-3 py-1.5 border-b-2 transition-colors capitalize ${
              tab === t ? "border-[#00A1E0] text-[#00A1E0]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "opportunities" ? `Opportunities (${opps.length})` : `Contacts (${contacts.length})`}
          </button>
        ))}
        <button onClick={disconnect} title="Disconnect" className="ml-auto text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors p-1 rounded">
          <IconX size={11} />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-[var(--shell-border)]">
        {tab === "opportunities" && (
          opps.length === 0
            ? <p className="p-4 text-center text-xs text-[var(--text-muted)]">No open opportunities.</p>
            : opps.map((opp) => (
                <div key={opp.Id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#00A1E0" }}>
                    <IconTrendingUp size={12} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{opp.Name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {opp.AccountName && <span className="text-[11px] text-[var(--text-muted)] truncate">{opp.AccountName}</span>}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${stageBadge(opp.StageName)}`}>{opp.StageName}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{fmtCurrency(opp.Amount)}</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                      {new Date(opp.CloseDate).toLocaleDateString("en-DE", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))
        )}
        {tab === "contacts" && (
          contacts.length === 0
            ? <p className="p-4 text-center text-xs text-[var(--text-muted)]">No contacts found.</p>
            : contacts.map((c) => (
                <div key={c.Id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: "#00A1E0" }}>
                    {initials(c.Name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.Name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{[c.Title, c.AccountName].filter(Boolean).join(" · ")}</p>
                  </div>
                  {c.Email && (
                    <a href={`mailto:${c.Email}`} className="text-[var(--text-muted)] hover:text-[var(--active-text)] transition-colors flex-shrink-0">
                      <IconArrowRight size={12} />
                    </a>
                  )}
                </div>
              ))
        )}
      </div>

      {/* Footer */}
      {activeConfig && (
        <div className="px-3 py-2 border-t border-[var(--shell-border)]">
          <a href={activeConfig.instance_url} target="_blank" rel="noopener noreferrer"
             className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[#00A1E0] transition-colors">
            Open Salesforce ↗
          </a>
        </div>
      )}
    </div>
  );
}
