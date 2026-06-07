"use client";
import { useState, useEffect, useCallback } from "react";
import { KpiCard, SectionCard, Badge, Insight, inputCls, selectCls } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";
import { useDemoMode } from "@/lib/demo/useDemoMode";
import { DEMO_GOVERNANCE_EVENTS, DEMO_ACCESS_RULES } from "@/lib/demo/fixtures";

// ── Types ─────────────────────────────────────────────────────────────────────

type HumanReview = {
  reviewer_id: string;
  verdict: "approved" | "rejected";
  override_reason: string;
  reviewed_at: string;
} | null;

type AuditEvent = {
  id: string;
  tenant_id: string;
  agent_run_id: string;
  agent_name: string;
  action_type: string;
  risk_score: number;
  eu_ai_act_articles: string[];
  input_context: {
    raw_input_hash: string;
    extracted_entities: Record<string, string>;
    model_id: string;
    prompt_version: string;
  };
  model_reasoning: {
    chain_of_thought: string;
    confidence: number;
    alternatives: string[];
    rationale: string;
  };
  sap_action: {
    object_type: string;
    object_id: string;
    operation: string;
    fields_before: Record<string, string>;
    fields_after: Record<string, string>;
  };
  human_review: HumanReview;
  hmac_signature: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  email_to_quote:  "Email → Quote",
  daily_briefing:  "Daily Briefing",
  account_360:     "Account 360",
  document_ai:     "Document AI",
};

function RiskBadge({ score }: { score: number }) {
  if (score >= 70) return <Badge variant="red">High {score}</Badge>;
  if (score >= 50) return <Badge variant="amber">Medium {score}</Badge>;
  return <Badge variant="green">Low {score}</Badge>;
}

function StatusBadge({ event }: { event: AuditEvent }) {
  if (event.human_review?.verdict === "approved") return <Badge variant="green">Approved</Badge>;
  if (event.human_review?.verdict === "rejected") return <Badge variant="red">Rejected</Badge>;
  if (event.risk_score >= 70) return <Badge variant="amber">Pending Review</Badge>;
  return <Badge variant="green">Auto-Approved</Badge>;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-DE", { dateStyle: "short", timeStyle: "short" });
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--admin-bg)] flex items-center justify-center mb-4 text-2xl">
        🛡
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        No AI audit events yet
      </p>
      <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
        Audit events appear here once AI Copilot agents start running in your workspace.
        Each action is logged with full reasoning, SAP field diffs and EU AI Act article coverage.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {["Art. 13 — Transparency", "Art. 14 — Human Oversight", "Art. 17 — QMS", "Art. 26 — Deployer Obligations"].map((a) => (
          <span
            key={a}
            className="text-[11px] px-2.5 py-1 rounded border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin)]"
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Expandable row detail ─────────────────────────────────────────────────────

function EventDetail({
  event,
  onReview,
}: {
  event: AuditEvent;
  onReview: (id: string, verdict: "approved" | "rejected", reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const needsReview = event.risk_score >= 70 && event.human_review === null;

  return (
    <div className="bg-[var(--shell-bg)] border-t border-[var(--shell-border)] px-4 py-4">
      <div className="grid grid-cols-3 gap-6">

        {/* ── Input Context ── */}
        <div>
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-2">
            Input Context
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Model: </span>
              <span className="font-mono text-[var(--text-primary)]">{event.input_context.model_id}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Prompt: </span>
              <span className="font-mono text-[var(--text-primary)]">{event.input_context.prompt_version}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Hash: </span>
              <span className="font-mono text-[9px] text-[var(--text-secondary)] break-all">
                {event.input_context.raw_input_hash}
              </span>
            </div>
            <div className="mt-1">
              <p className="text-[var(--text-muted)] mb-1">Extracted entities:</p>
              <div className="flex flex-col gap-0.5 pl-2 border-l-2 border-[var(--active-border)]">
                {Object.entries(event.input_context.extracted_entities).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-[var(--text-muted)] w-20 flex-shrink-0">{k}:</span>
                    <span className="text-[var(--text-primary)] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Model Reasoning ── */}
        <div>
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-2">
            Model Reasoning
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Confidence: </span>
              <span className={`font-semibold ${event.model_reasoning.confidence >= 0.8 ? "text-[var(--green-status)]" : event.model_reasoning.confidence >= 0.6 ? "text-[var(--amber-status)]" : "text-[var(--red-status)]"}`}>
                {Math.round(event.model_reasoning.confidence * 100)}%
              </span>
            </div>
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Chain of thought:</p>
              <p className="text-[var(--text-primary)] leading-relaxed pl-2 border-l-2 border-[var(--shell-border)]">
                {event.model_reasoning.chain_of_thought}
              </p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Rationale:</p>
              <p className="text-[var(--text-primary)] leading-relaxed pl-2 border-l-2 border-[var(--shell-border)]">
                {event.model_reasoning.rationale}
              </p>
            </div>
            {event.model_reasoning.alternatives.length > 0 && (
              <div>
                <p className="text-[var(--text-muted)] mb-0.5">Alternatives considered:</p>
                <ul className="pl-2 border-l-2 border-[var(--shell-border)] flex flex-col gap-0.5">
                  {event.model_reasoning.alternatives.map((a) => (
                    <li key={a} className="text-[var(--text-secondary)]">— {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── SAP Diff + HMAC + Review ── */}
        <div>
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-2">
            SAP Action
          </p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Object: </span>
              <span className="font-mono text-[var(--text-primary)]">
                {event.sap_action.object_type} / {event.sap_action.object_id}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Operation: </span>
              <Badge variant={event.sap_action.operation === "READ_ONLY" ? "gray" : "admin"}>
                {event.sap_action.operation}
              </Badge>
            </div>

            {Object.keys(event.sap_action.fields_after).length > 0 && (
              <div>
                <p className="text-[var(--text-muted)] mb-1">Field diff:</p>
                <div className="flex flex-col gap-1 pl-2 border-l-2 border-[var(--admin-border)]">
                  {Object.entries(event.sap_action.fields_after).map(([k, v]) => (
                    <div key={k} className="flex gap-2 items-start">
                      <span className="text-[var(--text-muted)] w-24 flex-shrink-0">{k}:</span>
                      <div className="flex flex-col">
                        {event.sap_action.fields_before[k] && (
                          <span className="line-through text-[var(--text-muted)] text-[10px]">
                            {event.sap_action.fields_before[k]}
                          </span>
                        )}
                        <span className="text-[var(--green-status)] font-medium">{v}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[var(--shell-border)]">
              <span className="text-[var(--text-muted)]">HMAC-SHA256: </span>
              <span className="font-mono text-[9px] text-[var(--text-secondary)] break-all">
                {event.hmac_signature}
              </span>
            </div>
          </div>

          {/* Already reviewed */}
          {event.human_review && (
            <div className="mt-3 pt-3 border-t border-[var(--shell-border)]">
              <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-1.5">
                Human Review
              </p>
              <div className="text-xs flex flex-col gap-0.5">
                <div>
                  <span className="text-[var(--text-muted)]">Verdict: </span>
                  <span className={`font-bold ${event.human_review.verdict === "approved" ? "text-[var(--green-status)]" : "text-[var(--red-status)]"}`}>
                    {event.human_review.verdict.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">By: </span>
                  {event.human_review.reviewer_id}
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Reason: </span>
                  {event.human_review.override_reason}
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">At: </span>
                  {fmtTime(event.human_review.reviewed_at)}
                </div>
              </div>
            </div>
          )}

          {/* Pending approval flow — Art. 14 */}
          {needsReview && (
            <div className="mt-3 pt-3 border-t border-[var(--red-border)]">
              <p className="font-mono text-[10px] font-semibold text-[var(--red-status)] tracking-widest uppercase mb-2">
                ⚠ Human Review Required — Art. 14
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mb-2">
                This action is blocked until approved. Enter a reason and choose a verdict.
              </p>
              <input
                className={`${inputCls} mb-2`}
                placeholder="Override reason (required to submit)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => reason && onReview(event.id, "approved", reason)}
                  disabled={!reason}
                  className="flex-1 text-xs font-semibold py-1.5 rounded bg-[var(--green-status)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => reason && onReview(event.id, "rejected", reason)}
                  disabled={!reason}
                  className="flex-1 text-xs font-semibold py-1.5 rounded bg-[var(--red-status)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI Data Access types + component ─────────────────────────────────────────

type DataScope = "all" | "team" | "own" | "none";

interface AccessRule {
  connector_type: string;
  role:           string;
  ai_enabled:     boolean;
  data_scope:     DataScope;
}

const CONNECTOR_LABELS: Record<string, string> = {
  salesforce:      "Salesforce",
  sap_sales_cloud: "SAP Sales Cloud",
  sap_s4hana:      "SAP S/4HANA",
};

const SCOPE_LABELS: Record<DataScope, { label: string; desc: string; color: string }> = {
  all:  { label: "All org data",    desc: "Every record in the connected system",         color: "var(--admin)"         },
  team: { label: "Team data",       desc: "Own records + direct reports",                  color: "var(--amber-status)"  },
  own:  { label: "Own records",     desc: "Only records where they are the owner",          color: "var(--green-status)"  },
  none: { label: "No AI access",    desc: "AI assistant cannot see this connector at all",  color: "var(--red-status)"    },
};

const ROLES    = ["Admin", "Manager", "Member"] as const;
const CONNECTORS = ["salesforce", "sap_sales_cloud", "sap_s4hana"] as const;

// System defaults — applied when no explicit rule is saved
const SYSTEM_DEFAULTS: Record<string, { ai_enabled: boolean; data_scope: DataScope }> = {
  Admin:   { ai_enabled: true, data_scope: "all"  },
  Manager: { ai_enabled: true, data_scope: "team" },
  Member:  { ai_enabled: true, data_scope: "own"  },
};

function ruleKey(connector: string, role: string) {
  return `${connector}::${role}`;
}

function AIDataAccess() {
  const isDemoMode = useDemoMode();
  // Map of "connector::role" → rule
  const [rules, setRules]     = useState<Map<string, AccessRule>>(new Map());
  const [saving, setSaving]   = useState<string | null>(null); // key being saved
  const [saved,  setSaved]    = useState<string | null>(null); // key just saved (flash)
  const [loading, setLoading] = useState(true);

  // Load existing rules
  useEffect(() => {
    if (isDemoMode) {
      const map = new Map<string, AccessRule>();
      for (const r of DEMO_ACCESS_RULES) {
        map.set(ruleKey(r.connector_type, r.role), r as AccessRule);
      }
      setRules(map);
      setLoading(false);
      return;
    }
    fetch("/api/admin/access-rules")
      .then((r) => r.json())
      .then((d: { rules?: AccessRule[] }) => {
        const map = new Map<string, AccessRule>();
        for (const r of d.rules ?? []) {
          map.set(ruleKey(r.connector_type, r.role), r);
        }
        setRules(map);
      })
      .catch(() => {/* start with defaults */})
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  // Get effective rule — explicit saved or system default
  const getRule = useCallback((connector: string, role: string): AccessRule => {
    const key = ruleKey(connector, role);
    return rules.get(key) ?? {
      connector_type: connector,
      role,
      ...SYSTEM_DEFAULTS[role] ?? { ai_enabled: true, data_scope: "own" },
    };
  }, [rules]);

  async function saveRule(connector: string, role: string, patch: Partial<AccessRule>) {
    const key  = ruleKey(connector, role);
    const prev = getRule(connector, role);
    const next: AccessRule = { ...prev, ...patch, connector_type: connector, role };

    // Optimistic update (works in demo too — state only, no API call)
    setRules((m) => new Map(m).set(key, next));
    if (isDemoMode) { setSaved(key); setTimeout(() => setSaved(null), 1000); return; }
    setSaving(key);

    try {
      await fetch("/api/admin/access-rules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          connector_type: connector,
          role,
          ai_enabled:     next.ai_enabled,
          data_scope:     next.data_scope,
        }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 1500);
    } catch {/* optimistic already applied */}

    setSaving(null);
  }

  return (
    <SectionCard title="AI Data Access">
      <div className="px-4 pb-4">

        {/* Explainer */}
        <div className="mb-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          Configure which records each role can see in the AI assistant.
          Rules apply to every user with that role across all connected systems of the same type.
          Changes take effect immediately — no restart required.
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading access rules…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {CONNECTORS.map((connector) => (
              <div key={connector}>
                {/* Connector heading */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[var(--admin)]">
                    {CONNECTOR_LABELS[connector]}
                  </span>
                  <div className="flex-1 h-px bg-[var(--admin-border)]" />
                </div>

                {/* Role rows */}
                <div className="flex flex-col gap-2">
                  {ROLES.map((role) => {
                    const rule = getRule(connector, role);
                    const key  = ruleKey(connector, role);
                    const isSaving = saving === key;
                    const isSaved  = saved  === key;
                    const scopeMeta = SCOPE_LABELS[rule.data_scope];

                    return (
                      <div
                        key={role}
                        className="flex items-center gap-4 p-3 rounded border border-[var(--shell-border)] bg-[var(--shell-surface)]"
                      >
                        {/* Role label */}
                        <div className="w-20 flex-shrink-0">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{role}</span>
                        </div>

                        {/* AI Enabled toggle */}
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <button
                            onClick={() => saveRule(connector, role, { ai_enabled: !rule.ai_enabled })}
                            disabled={isSaving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                              rule.ai_enabled
                                ? "bg-[var(--admin)]"
                                : "bg-[var(--shell-border)]"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                rule.ai_enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                              }`}
                            />
                          </button>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {rule.ai_enabled ? "AI on" : "AI off"}
                          </span>
                        </div>

                        {/* Data scope select */}
                        <select
                          className={`${selectCls} flex-1`}
                          value={rule.data_scope}
                          disabled={!rule.ai_enabled || isSaving}
                          onChange={(e) => saveRule(connector, role, { data_scope: e.target.value as DataScope })}
                        >
                          {(Object.keys(SCOPE_LABELS) as DataScope[]).filter(s => s !== "none").map((s) => (
                            <option key={s} value={s}>{SCOPE_LABELS[s].label}</option>
                          ))}
                        </select>

                        {/* Scope description */}
                        <div className="w-52 flex-shrink-0">
                          <span
                            className="text-[11px]"
                            style={{ color: rule.ai_enabled ? scopeMeta.color : "var(--text-muted)" }}
                          >
                            {rule.ai_enabled ? scopeMeta.desc : "AI assistant cannot see this connector"}
                          </span>
                        </div>

                        {/* Save indicator */}
                        <div className="w-16 flex-shrink-0 text-right">
                          {isSaving && (
                            <span className="text-[10px] text-[var(--text-muted)]">Saving…</span>
                          )}
                          {isSaved && (
                            <span className="text-[10px] text-[var(--green-status)] font-semibold">✓ Saved</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-[var(--shell-border)] flex flex-wrap gap-4">
          {(Object.entries(SCOPE_LABELS) as [DataScope, typeof SCOPE_LABELS[DataScope]][]).filter(([s]) => s !== "none").map(([scope, meta]) => (
            <div key={scope} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
              <span className="text-[11px] text-[var(--text-secondary)]">
                <strong style={{ color: meta.color }}>{meta.label}</strong> — {meta.desc}
              </span>
            </div>
          ))}
        </div>

        {/* SQL reminder */}
        <div className="mt-4 p-3 rounded border border-[var(--admin-border)] bg-[var(--admin-bg)]">
          <p className="font-mono text-[10px] font-semibold text-[var(--admin)] uppercase tracking-wider mb-1.5">
            ⚠ One-time setup required
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mb-2">
            Run this SQL once in the Supabase SQL editor to create the access rules table:
          </p>
          <pre className="font-mono text-[10px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS connector_access_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug    text NOT NULL,
  connector_type text NOT NULL,
  role           text NOT NULL,
  ai_enabled     boolean NOT NULL DEFAULT true,
  data_scope     text    NOT NULL DEFAULT 'own',
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, connector_type, role)
);`}</pre>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminGovernance() {
  const isDemoMode = useDemoMode();
  const tenant = useTenant();
  const [events, setEvents]           = useState<AuditEvent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterRisk, setFilterRisk]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch]           = useState("");

  // Fetch audit events — demo uses fixtures, production hits /api/audit
  useEffect(() => {
    if (isDemoMode) {
      setEvents(DEMO_GOVERNANCE_EVENTS as unknown as AuditEvent[]);
      setLoading(false);
      return;
    }
    fetch("/api/audit")
      .then((r) => r.json())
      .then((d: { events?: AuditEvent[] }) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  // ── Metrics ──
  const total         = events.length;
  const highRisk      = events.filter((e) => e.risk_score >= 70).length;
  const pendingReview = events.filter((e) => e.risk_score >= 70 && e.human_review === null).length;
  const articlesHit   = new Set(events.flatMap((e) => e.eu_ai_act_articles)).size;
  const coveragePct   = total > 0 ? Math.round((articlesHit / 4) * 100) : 0;

  // ── Human review handler ──
  function handleReview(id: string, verdict: "approved" | "rejected", reason: string) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              human_review: {
                reviewer_id:     `admin@${tenant.domain}`,
                verdict,
                override_reason: reason,
                reviewed_at:     new Date().toISOString(),
              },
            }
          : e
      )
    );
    setExpandedId(null);

    // Persist to API (skip in demo — state already updated locally)
    if (!isDemoMode) {
      fetch("/api/audit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, verdict, override_reason: reason }),
      }).catch(() => {/* non-critical */});
    }
  }

  // ── Filtering ──
  const filtered = events.filter((e) => {
    if (filterAgent !== "all" && e.agent_name !== filterAgent) return false;
    if (filterRisk === "high"   && e.risk_score < 70) return false;
    if (filterRisk === "medium" && (e.risk_score < 50 || e.risk_score >= 70)) return false;
    if (filterRisk === "low"    && e.risk_score >= 50) return false;
    if (filterStatus === "pending"  && !(e.risk_score >= 70 && e.human_review === null)) return false;
    if (filterStatus === "approved" && e.human_review?.verdict !== "approved") return false;
    if (filterStatus === "rejected" && e.human_review?.verdict !== "rejected") return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.action_type.toLowerCase().includes(q) &&
        !e.sap_action.object_id.toLowerCase().includes(q) &&
        !e.agent_name.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Governance</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Audit trail for all AI Copilot actions in <strong>{tenant.name}</strong> — EU AI Act compliance layer.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="AI Actions (30d)"
          value={loading ? "—" : String(total)}
          sub="All copilot-originated writes"
          color="var(--admin)"
        />
        <KpiCard
          label="High-Risk Flagged"
          value={loading ? "—" : String(highRisk)}
          sub="risk_score ≥ 70"
          color="var(--red-status)"
        />
        <KpiCard
          label="Pending Review"
          value={loading ? "—" : String(pendingReview)}
          sub="Art. 14 — awaiting human sign-off"
          color="var(--amber-status)"
        />
        <KpiCard
          label="EU AI Act Coverage"
          value={loading ? "—" : `${coveragePct}%`}
          sub={total > 0 ? `${articlesHit} / 4 articles evidenced` : "No events yet"}
          color="var(--green-status)"
        />
      </div>

      {/* Alert if reviews pending */}
      {pendingReview > 0 && (
        <div className="mb-4">
          <Insight
            admin
            text={
              <>
                <strong className="text-[var(--admin)]">
                  {pendingReview} action{pendingReview > 1 ? "s" : ""} require human review.
                </strong>{" "}
                High-risk AI writes are blocked until approved (EU AI Act Art. 14). Expand the
                flagged rows below to review and submit a verdict.
              </>
            }
          />
        </div>
      )}

      {/* AI Data Access governance */}
      <div className="mb-4">
        <AIDataAccess />
      </div>

      {/* Events table */}
      <SectionCard
        title="Audit Events"
        action={
          total > 0 ? (
            <button className="text-xs font-semibold px-3 py-1.5 rounded border border-[var(--admin-border)] text-[var(--admin)] bg-[var(--admin-bg)] hover:bg-[var(--admin)] hover:text-white transition-colors">
              ↓ Evidence Report
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            Loading audit events…
          </div>
        ) : total === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
              <select
                className={`${selectCls} w-40`}
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
              >
                <option value="all">All Agents</option>
                {[...new Set(events.map((e) => e.agent_name))].map((a) => (
                  <option key={a} value={a}>{AGENT_LABELS[a] ?? a}</option>
                ))}
              </select>

              <select
                className={`${selectCls} w-36`}
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High (≥ 70)</option>
                <option value="medium">Medium (50–69)</option>
                <option value="low">Low (0–49)</option>
              </select>

              <select
                className={`${selectCls} w-36`}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <input
                className={`${inputCls} flex-1`}
                placeholder="Search by action, object ID or agent…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[150px_130px_1fr_100px_130px_200px_28px] gap-3 px-4 py-2 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
              {["Timestamp", "Agent", "Action / Object", "Risk", "Status", "EU AI Act", ""].map((h) => (
                <span
                  key={h}
                  className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                No events match the current filters.
              </div>
            ) : (
              filtered.map((event) => (
                <div key={event.id} className="border-b border-[var(--shell-border)] last:border-0">
                  <div
                    className="grid grid-cols-[150px_130px_1fr_100px_130px_200px_28px] gap-3 px-4 py-2.5 hover:bg-[var(--shell-bg)] cursor-pointer transition-colors items-center"
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  >
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {fmtTime(event.created_at)}
                    </span>

                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {AGENT_LABELS[event.agent_name] ?? event.agent_name}
                    </span>

                    <div className="min-w-0">
                      <span className="text-xs text-[var(--text-primary)]">{event.action_type}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] ml-2">
                        {event.sap_action.object_id}
                      </span>
                    </div>

                    <span><RiskBadge score={event.risk_score} /></span>
                    <span><StatusBadge event={event} /></span>

                    <div className="flex flex-wrap gap-1">
                      {event.eu_ai_act_articles.map((a) => (
                        <Badge key={a} variant="admin">{a}</Badge>
                      ))}
                    </div>

                    <span className="text-[var(--text-muted)] text-xs select-none text-center">
                      {expandedId === event.id ? "▲" : "▼"}
                    </span>
                  </div>

                  {expandedId === event.id && (
                    <EventDetail event={event} onReview={handleReview} />
                  )}
                </div>
              ))
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
