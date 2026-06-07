/**
 * Tool registry — maps connector_type → ConnectorTool[].
 *
 * The agent route calls getToolsForConnectors() with the list of active
 * connector types to get the full set of tools available for a given tenant.
 */

import type { ConnectorTool } from "../agent-types";
import { sapTools }         from "./sap";
import { salesforceTools }  from "./salesforce";
import { graphTools }       from "./graph";

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Maps connector_type (as stored in connector_configs.connector_type)
 * to the tool definitions for that connector.
 *
 * microsoft-graph is always active (MSAL, no config row needed),
 * so it is included by default in getToolsForConnectors.
 */
export const CONNECTOR_TOOLS: Record<string, ConnectorTool[]> = {
  "sap-c4c":         sapTools,
  salesforce:        salesforceTools,
  "microsoft-graph": graphTools,
};

/**
 * Return all ConnectorTool instances for the given list of active connector types.
 *
 * @param connectorTypes  e.g. ["sap-c4c", "salesforce", "microsoft-graph"]
 */
export function getToolsForConnectors(connectorTypes: string[]): ConnectorTool[] {
  const seen  = new Set<string>();
  const tools: ConnectorTool[] = [];

  for (const type of connectorTypes) {
    const typeTools = CONNECTOR_TOOLS[type];
    if (!typeTools) continue;
    for (const t of typeTools) {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        tools.push(t);
      }
    }
  }
  return tools;
}

/**
 * Convert our ConnectorTool schema to the Anthropic tool_use format.
 * Safe to call with any set of tools — doesn't depend on a live connection.
 */
export function toAnthropicTools(
  tools: ConnectorTool[]
): Array<{
  name: string;
  description: string;
  input_schema: ConnectorTool["parameters"];
}> {
  return tools.map((t) => ({
    name:         t.name,
    description:  t.description,
    input_schema: t.parameters,
  }));
}
