/**
 * Connector contract — read-only by design (V1 scope). The SDK spec is
 * EXTRACTED from the SAP and Salesforce implementations in Phase 3, not
 * designed up-front; this file holds only what the skeleton already needs.
 */
import type { ConnectorHealth, ConnectorId, SessionUser } from "@/core/types";

/** A read-only operation the orchestration engine may invoke as an LLM tool. */
export interface ReadTool {
  name: string;
  description: string;
  /** JSON schema for the tool's parameters (given to the model). */
  parameters: Record<string, unknown>;
  /** Executes the read on behalf of the requesting user. Never writes. */
  execute(user: SessionUser, args: Record<string, unknown>): Promise<unknown>;
}

export interface Connector {
  id: ConnectorId;
  displayName: string;
  category: string;
  /** Verify the stored credentials work; used by setup UI and health checks. */
  testConnection(user: SessionUser): Promise<ConnectorHealth>;
  /** The read-only tools this connector contributes to the query engine. */
  tools(user: SessionUser): ReadTool[];
}
