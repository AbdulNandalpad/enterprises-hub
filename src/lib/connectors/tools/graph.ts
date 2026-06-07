/**
 * Microsoft Graph — agent tool definitions.
 *
 * Auth: Bearer token supplied by the client (MSAL access token).
 * The client sends it in the agent request body as `graphToken`.
 * The agent route stores it in AgentConnectorConfig.accessToken.
 *
 * Covers: calendar events (today + upcoming), recent emails.
 */

import type { ConnectorTool, AgentConnectorConfig, ToolResult } from "../agent-types";
import {
  getTodayEvents,
  getRecentMail,
  getMe,
} from "../graph/client";

const SOURCE = "Microsoft 365";

const NOT_CONNECTED: ToolResult = {
  success: false,
  error:
    "Microsoft 365 is not connected for this session. " +
    "Please ensure you are signed in with your Azure AD account.",
  source: SOURCE,
  tool: "",
};

// ─── Tools ────────────────────────────────────────────────────────────────────

export const graphTools: ConnectorTool[] = [
  // ── Calendar: today ────────────────────────────────────────────────────────
  {
    name: "graph_calendar_today",
    description:
      "Get the user's calendar events for today from Microsoft 365 (Outlook/Teams calendar). " +
      "Returns meeting subjects, start/end times, and online meeting links. " +
      "Use when asked about today's schedule, meetings, or calendar.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "graph_calendar_today" };
      }
      try {
        const data = await getTodayEvents(config.accessToken);
        return { success: true, data, source: SOURCE, tool: "graph_calendar_today" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "graph_calendar_today",
        };
      }
    },
  },

  // ── Emails ─────────────────────────────────────────────────────────────────
  {
    name: "graph_emails_recent",
    description:
      "Get recent emails from the user's Microsoft 365 inbox. Returns subjects, senders, " +
      "received times, read status, and a short body preview. " +
      "Use when asked about emails, inbox, or messages.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of emails to return (1–20). Default 10.",
          default: 10,
        },
      },
    },
    async execute(params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "graph_emails_recent" };
      }
      try {
        const limit = Math.min(20, Math.max(1, Math.floor(Number(params.limit ?? 10)) || 10));
        const data = await getRecentMail(config.accessToken, limit);
        return { success: true, data, source: SOURCE, tool: "graph_emails_recent" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "graph_emails_recent",
        };
      }
    },
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  {
    name: "graph_me",
    description:
      "Get the user's Microsoft 365 profile: display name, job title, department, and email. " +
      "Use when asked who the user is or about their profile.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_params, config: AgentConnectorConfig): Promise<ToolResult> {
      if (!config.accessToken) {
        return { ...NOT_CONNECTED, tool: "graph_me" };
      }
      try {
        const data = await getMe(config.accessToken);
        return { success: true, data, source: SOURCE, tool: "graph_me" };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
          source: SOURCE,
          tool: "graph_me",
        };
      }
    },
  },
];
