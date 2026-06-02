"use client";

/**
 * SAPWidget — SAP Sales Cloud (C4C) widget.
 * Reads connector configs from /api/admin/connectors?type=sap_sales_cloud
 * Data fetched via /api/connectors/sap/data (server-side basic auth proxy).
 * No OAuth dance — credentials are stored in Supabase and used server-side.
 */

import { useState, useEffect, useCallback } from "react";
import { IconTrendingUp, IconUsers, IconActivity } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfig {
  id: string; label: string; instance_url: string; connector_type: string;
}

interface SAPOpportunity {
  ObjectID: string; Name: string; SalesPhaseName: string;
  ExpectedValue: string | null; CloseDate: string | null; AccountName: string | null;
}

interface SAPAccount {
  ObjectID: string; AccountName: string;
  IndustryCode: string | null; CityName: string | null; CountryCode: string | null;
}

interface SAPActivity {
  ObjectID: string; Subject: string;
  CategoryCode: string; StatusCode: string;
  StartDateTime: string | null; AccountName: string | null;
}

interface SAPStats {
  totalOpportunities: number; openOpportunities: number; totalAccounts: number;
}

type SAPTab = "opportunities" | "accounts" | "activities";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    // SAP OData dates come as /Date(1234567890000)/
    const ms = iso.match(/\/Date\((\d+)\)\//)?.[1];
    const d  = ms ? new Date(Number(ms)) : new Date(iso);
    return d.toLocaleDateString("en-DE", { day: "numeric", month: "short" });
  } catch { return "—"; }
}

function activityIcon(category: string): string {
  switch (category) {
    case "01": return "📞"; // Phone call
    case "02": return "✉️"; // Email
    case "03": return "📅"; // Meeting
    default:   return "📌";
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case "1": return "bg-[var(--active-bg)] text-[var(--active-text)]";    // Open
    case "2": return "bg-[var(--green-status)]/15 text-[var(--green-status)]"; // Completed
    case "3": return "bg-[var(--shell-border)] text-[var(--text-muted)]";   // Cancelled
    default:  return "bg-[var(--shell-border)] text-[var(--text-muted)]";
  }
}

function statusLabel(status: string): string {
  return { "1": "Open", "2": "Done", "3": "Cancelled" }[status] ?? status;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1,2,3].map((i) => <div key={i} className="h-12 rounded-lg bg-[var(--shell-border)] animate-pulse" />)}
    </div>
  );
}

// ─── Org picker ───────────────────────────────────────────────────────────────

function OrgPicker({ configs, onSelect }: { configs: ConnectorConfig[]; onSelect: (c: ConnectorConfig) => void }) {
  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "#0070F3" }}>
          <IconTrendingUp size={18} className="text-white" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Select SAP System</p>
      </div>
      <div className="space-y-2">
        {configs.map((c) => (
          <button key={c.id} onClick={() => onSelect(c)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--shell-border)] hover:border-[#0070F3] hover:bg-[var(--active-bg)] transition-all text-left">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: "#0070F3" }}>
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

// ─── Main widget ──────────────────────────────────────────────────────────────

export function SAPWidget() {
  const [configs,      setConfigs]      = useState<ConnectorConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<ConnectorConfig | null>(null);
  const [tab,          setTab]          = useState<SAPTab>("opportunities");
  const [stats,        setStats]        = useState<SAPStats | null>(null);
  const [opps,         setOpps]         = useState<SAPOpportunity[]>([]);
  const [accounts,     setAccounts]     = useState<SAPAccount[]>([]);
  const [activities,   setActivities]   = useState<SAPActivity[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  // Load available SAP configs
  useEffect(() => {
    fetch("/api/admin/connectors?type=sap_sales_cloud")
      .then((r) => r.json())
      .then((data: ConnectorConfig[]) => {
        const list = Array.isArray(data) ? data : [];
        setConfigs(list);
        if (list.length === 1) setActiveConfig(list[0]);
        else if (list.length === 0) setLoading(false);
      })
      .catch(() => { setConfigs([]); setLoading(false); });
  }, []);

  const loadData = useCallback(async (config: ConnectorConfig) => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, oppsRes, accountsRes, activitiesRes] = await Promise.all([
        fetch(`/api/connectors/sap/data?configId=${config.id}&type=stats`),
        fetch(`/api/connectors/sap/data?configId=${config.id}&type=opportunities`),
        fetch(`/api/connectors/sap/data?configId=${config.id}&type=accounts`),
        fetch(`/api/connectors/sap/data?configId=${config.id}&type=activities`),
      ]);

      if (statsRes.status === 401) {
        setError("Invalid SAP credentials. Update them in Admin → Connectors.");
        setLoading(false);
        return;
      }

      const [statsData, oppsData, accountsData, activitiesData] = await Promise.all([
        statsRes.json(), oppsRes.json(), accountsRes.json(), activitiesRes.json(),
      ]);

      setStats(statsData as SAPStats);
      setOpps(Array.isArray(oppsData) ? oppsData as SAPOpportunity[] : []);
      setAccounts(Array.isArray(accountsData) ? accountsData as SAPAccount[] : []);
      setActivities(Array.isArray(activitiesData) ? activitiesData as SAPActivity[] : []);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load SAP data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeConfig) loadData(activeConfig);
  }, [activeConfig, loadData]);

  // ── Render states ─────────────────────────────────────────────────────────

  if (!loading && configs.length === 0) {
    return (
      <div className="p-4 text-center space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">No SAP system registered</p>
        <p className="text-xs text-[var(--text-muted)]">Ask your admin to add one in Admin → Connectors.</p>
      </div>
    );
  }

  if (configs.length > 1 && !activeConfig) {
    return <OrgPicker configs={configs} onSelect={setActiveConfig} />;
  }

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="p-4 text-center space-y-2">
        <p className="text-xs text-[var(--red-status)]">{error}</p>
        <button onClick={() => activeConfig && loadData(activeConfig)} className="text-xs text-[var(--active-text)] hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Org strip */}
      {configs.length > 1 && activeConfig && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--green-status)]" />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">{activeConfig.label}</span>
          </div>
          <button onClick={() => setActiveConfig(null)} className="text-[10px] text-[var(--active-text)] hover:underline">Switch</button>
        </div>
      )}

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 p-3 border-b border-[var(--shell-border)]">
          <div className="rounded-lg border border-[var(--shell-border)] p-2">
            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Total Opps</p>
            <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">{stats.totalOpportunities}</p>
          </div>
          <div className="rounded-lg border border-[var(--shell-border)] p-2">
            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Open</p>
            <p className="text-base font-semibold text-[var(--active-text)] mt-0.5">{stats.openOpportunities}</p>
          </div>
          <div className="rounded-lg border border-[var(--shell-border)] p-2">
            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Accounts</p>
            <p className="text-base font-semibold text-[var(--text-primary)] mt-0.5">{stats.totalAccounts}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--shell-border)] px-3 pt-1">
        {(["opportunities", "accounts", "activities"] as SAPTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs font-medium px-2.5 py-1.5 border-b-2 transition-colors capitalize ${
              tab === t ? "border-[#0070F3] text-[#0070F3]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t === "opportunities" ? `Opps (${opps.length})` : t === "accounts" ? `Accounts (${accounts.length})` : `Activities (${activities.length})`}
          </button>
        ))}
      </div>

      {/* Lists */}
      <div className="divide-y divide-[var(--shell-border)]">
        {tab === "opportunities" && (
          opps.length === 0
            ? <p className="p-4 text-center text-xs text-[var(--text-muted)]">No opportunities.</p>
            : opps.map((opp) => (
                <div key={opp.ObjectID} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#0070F3" }}>
                    <IconTrendingUp size={12} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{opp.Name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {opp.AccountName && <span className="text-[11px] text-[var(--text-muted)] truncate">{opp.AccountName}</span>}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--active-bg)] text-[var(--active-text)]">
                        {opp.SalesPhaseName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {opp.ExpectedValue && <p className="text-xs font-semibold text-[var(--text-primary)]">{opp.ExpectedValue}</p>}
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">{fmtDate(opp.CloseDate)}</p>
                  </div>
                </div>
              ))
        )}

        {tab === "accounts" && (
          accounts.length === 0
            ? <p className="p-4 text-center text-xs text-[var(--text-muted)]">No accounts.</p>
            : accounts.map((acc) => (
                <div key={acc.ObjectID} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: "#0070F3" }}>
                    {acc.AccountName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{acc.AccountName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {[acc.IndustryCode, acc.CityName, acc.CountryCode].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))
        )}

        {tab === "activities" && (
          activities.length === 0
            ? <p className="p-4 text-center text-xs text-[var(--text-muted)]">No recent activities.</p>
            : activities.map((act) => (
                <div key={act.ObjectID} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--hover-bg)] transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: "var(--shell-bg)" }}>
                    {activityIcon(act.CategoryCode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{act.Subject}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {act.AccountName && <span className="text-[11px] text-[var(--text-muted)] truncate">{act.AccountName}</span>}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusBadge(act.StatusCode)}`}>
                        {statusLabel(act.StatusCode)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] flex-shrink-0">{fmtDate(act.StartDateTime)}</span>
                </div>
              ))
        )}
      </div>

      {activeConfig && (
        <div className="px-3 py-2 border-t border-[var(--shell-border)]">
          <a href={activeConfig.instance_url} target="_blank" rel="noopener noreferrer"
             className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[#0070F3] transition-colors">
            Open SAP Sales Cloud ↗
          </a>
        </div>
      )}
    </div>
  );
}
