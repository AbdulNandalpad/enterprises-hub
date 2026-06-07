/**
 * SAP Sales Cloud (C4C) — agent tool definitions.
 *
 * Calls getSAP* directly (no HTTP round-trip to /api/connectors/sap/*).
 * Auth: Basic (client_id = username, client_secret = password).
 */

import type { ConnectorTool, AgentConnectorConfig, ToolResult } from "../agent-types";
import {
  getSAPOpportunities,
  getSAPAccounts,
  getSAPActivities,
  getSAPStats,
} from "../sap/client";

const SOURCE = "SAP Sales Cloud";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: unknown, min: number, max: number, def: number): number {
  const n = Number(val);
  return isNaN(n) ? def : Math.min(max, Math.max(min, Math.floor(n)));
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const sapTools: ConnectorTool[] = [
  // ── Opportunities ──────────────────────────────────────────────────────────
  {
    name: "sap_opportunities",
    description:
      "List open opportunities from SAP Sales Cloud. Returns opportunity names, sales phases, " +
      "expected values, close dates, and associated accounts. Use when asked about SAP pipeline, " +
      "deals, or opportunities.",
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
      try {
        const limit = clamp(params.limit, 1, 25, 10);
        const data = await getSAPOpportunities(
          config.instance_url,
          config.client_id,
          config.client_secret,
          limit
        );
        return { success: true, data, source: SOURCE, tool: "sap_opportunities" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sap_opportunities",
        };
      }
    },
  },

  // ── Accounts ───────────────────────────────────────────────────────────────
  {
    name: "sap_accounts",
    description:
      "List customer accounts from SAP Sales Cloud. Returns account names, industry, city, " +
      "and country. Use when asked about SAP customers or accounts.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of accounts to return (1–25). Default 10.",
          default: 10,
        },
      },
    },
    async execute(params, config: AgentConnectorConfig): Promise<ToolResult> {
      try {
        const limit = clamp(params.limit, 1, 25, 10);
        const data = await getSAPAccounts(
          config.instance_url,
          config.client_id,
          config.client_secret,
          limit
        );
        return { success: true, data, source: SOURCE, tool: "sap_accounts" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sap_accounts",
        };
      }
    },
  },

  // ── Activities ─────────────────────────────────────────────────────────────
  {
    name: "sap_activities",
    description:
      "List recent activities (calls, meetings, tasks) from SAP Sales Cloud. Returns subjects, " +
      "categories, statuses, start times, and associated accounts.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of activities to return (1–20). Default 8.",
          default: 8,
        },
      },
    },
    async execute(params, config: AgentConnectorConfig): Promise<ToolResult> {
      try {
        const limit = clamp(params.limit, 1, 20, 8);
        const data = await getSAPActivities(
          config.instance_url,
          config.client_id,
          config.client_secret,
          limit
        );
        return { success: true, data, source: SOURCE, tool: "sap_activities" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sap_activities",
        };
      }
    },
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  {
    name: "sap_stats",
    description:
      "Get pipeline summary statistics from SAP Sales Cloud: total opportunities, open " +
      "opportunities, and total accounts. Use for high-level SAP CRM overview.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params, config: AgentConnectorConfig): Promise<ToolResult> {
      try {
        const data = await getSAPStats(
          config.instance_url,
          config.client_id,
          config.client_secret
        );
        return { success: true, data, source: SOURCE, tool: "sap_stats" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "sap_stats",
        };
      }
    },
  },
];
