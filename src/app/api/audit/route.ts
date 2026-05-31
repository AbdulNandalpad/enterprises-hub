/**
 * /api/audit
 *
 * GET  — paginated list of AI audit events for the authenticated tenant
 * PATCH /:id/review — submit human review verdict (approved | rejected)
 *
 * TODO: Replace stub responses with real Cosmos DB queries once
 *       the Azure Cosmos DB account and ai_audit_events container are provisioned.
 *       See infra/cosmos/ai-audit-container.bicep (to be created).
 */

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const agent  = searchParams.get("agent")  ?? undefined;
  const risk   = searchParams.get("risk")   ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  // Stub — returns empty until Cosmos is wired
  // Real implementation: query Cosmos container ai_audit_events
  // filtered by tenant_id from MSAL token, with agent/risk/status filters
  return NextResponse.json({
    events: [],
    page,
    limit,
    filters: { agent, risk, status },
    _note: "Stub — connect to Cosmos DB to return real audit events",
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { id, verdict, override_reason } = body as {
    id: string;
    verdict: "approved" | "rejected";
    override_reason: string;
  };

  if (!id || !verdict || !override_reason) {
    return NextResponse.json(
      { error: "id, verdict and override_reason are required" },
      { status: 400 }
    );
  }

  // Stub — real implementation: patch Cosmos document human_review field
  return NextResponse.json({
    id,
    human_review: {
      verdict,
      override_reason,
      reviewed_at: new Date().toISOString(),
    },
    _note: "Stub — connect to Cosmos DB to persist the review verdict",
  });
}
