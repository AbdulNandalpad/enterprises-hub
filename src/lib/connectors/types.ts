/**
 * Connector interface — every integration (Graph, SAP, Salesforce, …)
 * implements this shape.
 *
 * `buildContext()` is the key method: it returns a plain-text string that
 * is appended to each AI request as grounding context. If the connector
 * cannot provide data (token missing, scope not granted, network error)
 * it returns undefined so the AI call still proceeds without context.
 */

export interface Connector {
  id: string;
  name: string;
  description: string;
  /** Returns live context text, or undefined on failure */
  buildContext: () => Promise<string | undefined>;
}

/** A connector entry shown in the registry UI (does not carry runtime logic) */
export interface ConnectorMeta {
  id: string;
  name: string;
  description: string;
  category: "microsoft" | "crm" | "itsm" | "project" | "erp" | "other";
  docsUrl?: string;
  /** True when the connector is always active for authenticated users */
  alwaysActive?: boolean;
}
