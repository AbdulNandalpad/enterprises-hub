/**
 * Salesforce CRM — agent tool definitions.
 *
 * Auth: OAuth2 Bearer token pre-resolved by the agent route.
 * The agent route reads from httpOnly cookies (sf_token_*) or refreshes
 * from Supabase connector_tokens before invoking these tools.
 *
 * Data scope (all/team/own/none) is resolved from connector_access_rules
 * and stored on AgentConnectorConfig.dataScope.
 */

import type { ConnectorTool, AgentConnectorConfig, ToolResult } from "../agent-types";
import {
  getOpportunities,
  getContacts,
  getDashboardStats,
} from "../salesforce/client";

const SOURCE = "Salesforce";

const NOT_CONNECTED: ToolResult = {
  success: false,
  error:
    "Salesforce is not connected or the session has expired. " +
    "Please re-authenticate in Settings → Connectors.",
  source: SOURCE,
  tool: "",
};

// ─── Helper: build ownerScope from config ─────────────────────────────────────

function ownerScope(
  config: AgentConnectorConfig
): { scope: "own" | "team"; email: string } | undefined {
  if (
    !config.userEmail ||
    !config.dataScope ||
    config.dataScope === "all" ||
    config.dataScope === "none"
  ) {
    return undefined;
  }
  return { scope: config.dataScope as "own" | "team", email: config.userEmail };
}

function clamp(val: unknown, min: number, max: number, def: number): number {
  const n = Number(val);
  return isNaN(n) ? def : Math.min(max, Math.max(min, Math.floor(n)));
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const salesforceTools: ConnectorTool[] = [
  // ── Opportunities ──────────────────────────────────────────────────────────
  {
    name: "sf_opportunities",
    description:
      "List open (and recently closed) opportunities from Salesforce CRM. Returns opportunity " +
      "names, stages, amounts, close dates, accounts, and probability. Use when asked about " +
      "Salesforce pipeline, deals, or revenue.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of opportunities to return (1–25). Default 10.",
          default: 10,
        },
      },
    },
    async execute(params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "sf_opportunities" };
      }
      if (config.dataScope === "none") {
        return {
          success: false,
          error: "Access denied — your role does not permit AI access to Salesforce data.",
          source: SOURCE,
          tool: "sf_opportunities",
        };
      }
      try {
        const limit = clamp(params.limit, 1, 25, 10);
        const data = await getOpportunities(
          config.instance_url,
          config.accessToken,
          limit,
          ownerScope(config)
        );
        return { success: true, data, source: SOURCE, tool: "sf_opportunities" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sf_opportunities",
        };
      }
    },
  },

  // ── Contacts ───────────────────────────────────────────────────────────────
  {
    name: "sf_contacts",
    description:
      "List recent contacts from Salesforce CRM. Returns names, titles, emails, phone numbers, " +
      "and associated accounts. Use when asked about Salesforce contacts or people.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of contacts to return (1–20). Default 8.",
          default: 8,
        },
      },
    },
    async execute(params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "sf_contacts" };
      }
      if (config.dataScope === "none") {
        return {
          success: false,
          error: "Access denied — your role does not permit AI access to Salesforce data.",
          source: SOURCE,
          tool: "sf_contacts",
        };
      }
      try {
        const limit = clamp(params.limit, 1, 20, 8);
        const data = await getContacts(config.instance_url, config.accessToken, limit);
        return { success: true, data, source: SOURCE, tool: "sf_contacts" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sf_contacts",
        };
      }
    },
  },

  // ── Dashboard stats ────────────────────────────────────────────────────────
  {
    name: "sf_stats",
    description:
      "Get CRM pipeline statistics from Salesforce: total opportunities, open pipeline value, " +
      "open opportunity count, and closed-won deals this month. Use for Salesforce overview.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "sf_stats" };
      }
      if (config.dataScope === "none") {
        return {
          success: false,
          error: "Access denied — your role does not permit AI access to Salesforce data.",
          source: SOURCE,
          tool: "sf_stats",
        };
      }
      try {
        const data = await getDashboardStats(
          config.instance_url,
          config.accessToken,
          ownerScope(config)
        );
        return { success: true, data, source: SOURCE, tool: "sf_stats" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sf_stats",
        };
      }
    },
  },
];
