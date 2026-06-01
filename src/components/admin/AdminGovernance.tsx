"use client";
import { useState } from "react";
import { KpiCard, SectionCard, Badge, Insight, inputCls, selectCls } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";

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

// ── Mock data (matches Cosmos schema exactly — swap for real API later) ────────

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: "evt-001",
    tenant_id: "placeholder",
    agent_run_id: "run-a1b2c3",
    agent_name: "email_to_quote",
    action_type: "CREATE_QUOTE",
    risk_score: 82,
    eu_ai_act_articles: ["Art. 13", "Art. 14", "Art. 17", "Art. 26"],
    input_context: {
      raw_input_hash: "sha256:7f3a9c2e4d1b8e6f...",
      extracted_entities: { customer: "Bosch GmbH", product: "Sealing Ring X7", quantity: "500" },
      model_id: "gpt-4o-2024-08",
      prompt_version: "v2.1.0",
    },
    model_reasoning: {
      chain_of_thought: "Email identified as purchase intent. Customer entity extracted from subject and body. SAP C4C quote template matched to product catalogue entry.",
      confidence: 0.91,
      alternatives: ["Mark as inquiry only", "Request human confirmation"],
      rationale: "High confidence extraction — customer is a known SAP account. Quote value within normal parameters.",
    },
    sap_action: {
      object_type: "Opportunity",
      object_id: "OPP-2024-0412",
      operation: "CREATE",
      fields_before: {},
      fields_after: { status: "Open", amount: "€24,500", owner: "AI Copilot", account: "Bosch GmbH" },
    },
    human_review: null,
    hmac_signature: "a3f9d2c1e8b74f2a...",
    created_at: "2026-05-30T08:14:22Z",
  },
  {
    id: "evt-002",
    tenant_id: "placeholder",
    agent_run_id: "run-b2c3d4",
    agent_name: "account_360",
    action_type: "UPDATE_ACCOUNT",
    risk_score: 61,
    eu_ai_act_articles: ["Art. 13", "Art. 14", "Art. 17"],
    input_context: {
      raw_input_hash: "sha256:2c8f1a7b9e3d5c4f...",
      extracted_entities: { account: "Schaeffler AG", field: "revenue_tier", value: "Enterprise" },
      model_id: "gpt-4o-2024-08",
      prompt_version: "v2.0.3",
    },
    model_reasoning: {
      chain_of_thought: "Account revenue data updated via CRM trigger. Tier reclassification triggered by Q1 revenue exceeding Enterprise threshold.",
      confidence: 0.87,
      alternatives: ["Keep current tier"],
      rationale: "Automated tier upgrade — revenue threshold breach is unambiguous. Low write risk.",
    },
    sap_action: {
      object_type: "Account",
      object_id: "ACC-SCH-0091",
      operation: "UPDATE",
      fields_before: { revenue_tier: "Mid-Market" },
      fields_after: { revenue_tier: "Enterprise" },
    },
    human_review: null,
    hmac_signature: "b8e2f1d3c5a94e7b...",
    created_at: "2026-05-30T07:52:11Z",
  },
  {
    id: "evt-003",
    tenant_id: "placeholder",
    agent_run_id: "run-c3d4e5",
    agent_name: "document_ai",
    action_type: "EXTRACT_CONTRACT",
    risk_score: 23,
    eu_ai_act_articles: ["Art. 13"],
    input_context: {
      raw_input_hash: "sha256:9d4e3b2f7a1c6e8d...",
      extracted_entities: { document: "MSA-2026-Trelleborg.pdf", pages: "14" },
      model_id: "gpt-4o-2024-08",
      prompt_version: "v1.9.0",
    },
    model_reasoning: {
      chain_of_thought: "Contract document uploaded. Extraction only — no write to SAP triggered.",
      confidence: 0.97,
      alternatives: [],
      rationale: "Read-only extraction. No data written. Low risk.",
    },
    sap_action: {
      object_type: "Contract",
      object_id: "CTR-2026-0041",
      operation: "READ_ONLY",
      fields_before: {},
      fields_after: {},
    },
    human_review: null,
    hmac_signature: "c1f4a8d2e6b37f9c...",
    created_at: "2026-05-30T07:31:05Z",
  },
  {
    id: "evt-004",
    tenant_id: "placeholder",
    agent_run_id: "run-d4e5f6",
    agent_name: "daily_briefing",
    action_type: "UPDATE_ACCOUNT",
    risk_score: 77,
    eu_ai_act_articles: ["Art. 13", "Art. 14", "Art. 17", "Art. 26"],
    input_context: {
      raw_input_hash: "sha256:1a2b3c4d5e6f7a8b...",
      extracted_entities: { account: "Müller Präzisionsteile", field: "credit_limit", value: "€500,000" },
      model_id: "gpt-4o-2024-08",
      prompt_version: "v2.1.0",
    },
    model_reasoning: {
      chain_of_thought: "Daily briefing detected 45-day overdue payment pattern. Automated credit limit reduction flagged per risk policy.",
      confidence: 0.79,
      alternatives: ["Send payment reminder only", "Escalate to account manager"],
      rationale: "Credit limit change is high-impact. Requires human sign-off per internal policy.",
    },
    sap_action: {
      object_type: "Account",
      object_id: "ACC-MUL-0033",
      operation: "UPDATE",
      fields_before: { credit_limit: "€750,000" },
      fields_after: { credit_limit: "€500,000" },
    },
    human_review: {
      reviewer_id: "admin@workspace",
      verdict: "approved",
      override_reason: "Confirmed with credit team. Reduction approved.",
      reviewed_at: "2026-05-30T09:10:00Z",
    },
    hmac_signature: "d9a3f2e1b8c74d6e...",
    created_at: "2026-05-30T06:45:30Z",
  },
  {
    id: "evt-005",
    tenant_id: "placeholder",
    agent_run_id: "run-e5f6g7",
    agent_name: "email_to_quote",
    action_type: "CREATE_QUOTE",
    risk_score: 88,
    eu_ai_act_articles: ["Art. 13", "Art. 14", "Art. 17", "Art. 26"],
    input_context: {
      raw_input_hash: "sha256:5e6f7a8b9c0d1e2f...",
      extracted_entities: { customer: "Unknown", product: "Custom Seal Assembly", quantity: "10,000" },
      model_id: "gpt-4o-2024-08",
      prompt_version: "v2.1.0",
    },
    model_reasoning: {
      chain_of_thought: "Email from unrecognized sender. High quantity order. Customer entity not found in SAP account master.",
      confidence: 0.62,
      alternatives: ["Reject quote", "Create as draft only", "Escalate to sales manager"],
      rationale: "Unknown customer with large order value. Confidence below threshold for auto-create.",
    },
    sap_action: {
      object_type: "Opportunity",
      object_id: "OPP-PENDING",
      operation: "CREATE",
      fields_before: {},
      fields_after: { status: "Pending Review", amount: "€182,000", owner: "AI Copilot" },
    },
    human_review: {
      reviewer_id: "admin@workspace",
      verdict: "rejected",
      override_reason: "Unknown customer — cannot create quote without a verified SAP account.",
      reviewed_at: "2026-05-30T08:55:00Z",
    },
    hmac_signature: "e7b2c4f1a9d35e8f...",
    created_at: "2026-05-30T06:12:44Z",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  email_to_quote: "Email → Quote",
  daily_briefing: "Daily Briefing",
  account_360:    "Account 360",
  document_ai:    "Document AI",
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
                This SAP write is blocked until approved. Enter a reason and choose a verdict.
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

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminGovernance() {
  const tenant = useTenant();

  // Substitute tenant-specific values into mock data so no hardcoded org names show
  const tenantEvents: AuditEvent[] = MOCK_EVENTS.map((e) => ({
    ...e,
    tenant_id: tenant.slug,
    human_review: e.human_review
      ? { ...e.human_review, reviewer_id: `admin@${tenant.domain}` }
      : null,
  }));

  const [events, setEvents] = useState<AuditEvent[]>(tenantEvents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  // ── Metrics ──
  const total = events.length;
  const highRisk = events.filter((e) => e.risk_score >= 70).length;
  const pendingReview = events.filter((e) => e.risk_score >= 70 && e.human_review === null).length;
  const articlesHit = new Set(events.flatMap((e) => e.eu_ai_act_articles)).size;
  const coveragePct = Math.round((articlesHit / 4) * 100); // 4 articles total

  // ── Human review handler ──
  function handleReview(id: string, verdict: "approved" | "rejected", reason: string) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              human_review: {
                reviewer_id: `admin@${tenant.domain}`,
                verdict,
                override_reason: reason,
                reviewed_at: new Date().toISOString(),
              },
            }
          : e
      )
    );
    setExpandedId(null);
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
          value={String(total)}
          sub="All copilot-originated writes"
          color="var(--admin)"
        />
        <KpiCard
          label="High-Risk Flagged"
          value={String(highRisk)}
          sub="risk_score ≥ 70"
          color="var(--red-status)"
        />
        <KpiCard
          label="Pending Review"
          value={String(pendingReview)}
          sub="Art. 14 — awaiting human sign-off"
          color="var(--amber-status)"
        />
        <KpiCard
          label="EU AI Act Coverage"
          value={`${coveragePct}%`}
          sub={`${articlesHit} / 4 articles evidenced`}
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

      {/* Events table */}
      <SectionCard
        title="Audit Events"
        action={
          <button className="text-xs font-semibold px-3 py-1.5 rounded border border-[var(--admin-border)] text-[var(--admin)] bg-[var(--admin-bg)] hover:bg-[var(--admin)] hover:text-white transition-colors">
            ↓ Evidence Report
          </button>
        }
      >
        {/* Filter bar */}
        <div className="flex gap-2 px-4 py-3 border-b border-[var(--shell-border)] bg-[var(--shell-bg)]">
          <select
            className={`${selectCls} w-40`}
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
          >
            <option value="all">All Agents</option>
            <option value="email_to_quote">Email → Quote</option>
            <option value="daily_briefing">Daily Briefing</option>
            <option value="account_360">Account 360</option>
            <option value="document_ai">Document AI</option>
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

                <span>
                  <RiskBadge score={event.risk_score} />
                </span>

                <span>
                  <StatusBadge event={event} />
                </span>

                <div className="flex flex-wrap gap-1">
                  {event.eu_ai_act_articles.map((a) => (
                    <Badge key={a} variant="admin">
                      {a}
                    </Badge>
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
      </SectionCard>
    </div>
  );
}
