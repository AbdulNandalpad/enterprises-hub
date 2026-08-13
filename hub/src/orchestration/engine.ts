/**
 * The Query Engine — the product spine. Phase 3 implements the tool-calling
 * loop: question → model plans reads → connectors execute on-behalf-of the
 * user → synthesized, cited answer → audit written in the same path.
 * The skeleton pins the contract so the UI and gateway build against it.
 */
import type { ConnectorId, SessionUser } from "@/core/types";

export interface Citation {
  system: ConnectorId;
  entity: string;
}

export interface Answer {
  text: string;
  citations: Citation[];
  systems: ConnectorId[];
  confidence: "high" | "needs_review";
  answeredAt: Date;
}

export async function askQuestion(_user: SessionUser, _question: string): Promise<Answer> {
  throw new Error("NOT_IMPLEMENTED: query engine arrives in Phase 3");
}
