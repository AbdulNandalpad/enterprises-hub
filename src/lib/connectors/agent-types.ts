/**
 * Cross-system AI agent types.
 *
 * ConnectorTool — a single callable tool backed by a live connector.
 * AgentConnectorConfig — connector config + pre-resolved auth tokens.
 * ToolResult — the typed result returned from every tool execution.
 */

// ─── Tool parameter schema ────────────────────────────────────────────────────

export interface AgentToolParam {
  type: "string" | "number" | "boolean" | "integer";
  description: string;
  enum?: string[];
  default?: unknown;
}

// ─── Core tool interface ──────────────────────────────────────────────────────

export interface ConnectorTool {
  /** Unique name used as the Anthropic/OpenAI tool name — snake_case */
  name: string;

  /** Plain-English description so the AI knows when to use this tool */
  description: string;

  /** JSON Schema (object type) describing the tool's input parameters */
  parameters: {
    type: "object";
    properties: Record<string, AgentToolParam>;
    required?: string[];
  };

  /**
   * Execute this tool.
   * Must never throw — errors are returned as ToolResult.success = false.
   */
  execute(
    params: Record<string, unknown>,
    config: AgentConnectorConfig
  ): Promise<ToolResult>;
}

// ─── Connector config (with resolved tokens) ─────────────────────────────────

/** Data-access scope resolved from connector_access_rules */
export type DataScope = "all" | "team" | "own" | "none";

export interface AgentConnectorConfig {
  /** UUID from connector_configs row */
  id: string;

  /** e.g. "sap-c4c" | "salesforce" | "microsoft-graph" */
  connector_type: string;

  /** e.g. https://my.sapcloud.com */
  instance_url: string;

  /** Basic-auth username (SAP) or OAuth app client_id (Salesforce) */
  client_id: string;

  /** Basic-auth password (SAP) or OAuth app client_secret (Salesforce) */
  client_secret: string;

  extra_config?: Record<string, unknown>;

  /**
   * Pre-resolved OAuth access token.
   * Populated for token-based connectors (Salesforce, Microsoft Graph)
   * before tools are called. Tools check for this — missing = not connected.
   */
  accessToken?: string;

  /** Authenticated user email (for data-scoping and audit) */
  userEmail?: string;

  /** Most-permissive data scope resolved from connector_access_rules */
  dataScope?: DataScope;
}

// ─── Tool result ──────────────────────────────────────────────────────────────

export interface ToolResult {
  success: boolean;

  /** The fetched data (any JSON-serialisable structure) */
  data?: unknown;

  /** Human-readable error message — only present when success = false */
  error?: string;

  /** Display label of the source system, e.g. "SAP Sales Cloud" */
  source: string;

  /** The tool name that produced this result (for attribution) */
  tool: string;
}

// ─── Anthropic tool-call shapes ───────────────────────────────────────────────

/** A single tool_use block inside an Anthropic response */
export interface AnthropicToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** A text block inside an Anthropic response */
export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export type AnthropicContentBlock = AnthropicToolUse | AnthropicTextBlock;

/** Minimal shape of an Anthropic Messages API response */
export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | string;
  usage: { input_tokens: number; output_tokens: number };
}
