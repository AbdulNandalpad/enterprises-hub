/**
 * POST /api/ai/agent — cross-system AI orchestration endpoint.
 *
 * Unlike /api/ai/chat (which takes a static context string), this endpoint
 * gives the AI *agency*: it decides which connectors to query based on the
 * question, calls them in parallel via tool_use, and synthesises a grounded
 * answer from live data across all connected systems.
 *
 * Flow:
 *   1. Parse request + CSRF guard + rate limit
 *   2. Resolve identity (user email) and tenant slug
 *   3. Load active connector_configs from Supabase for this tenant
 *   4. Pre-resolve auth tokens (SAP: basic auth ready; SF: cookie → refresh;
 *      Graph: client-supplied MSAL token)
 *   5. Resolve data-access scopes from connector_access_rules
 *   6. Build Anthropic tool definitions for active connectors
 *   7. Run orchestration loop (max MAX_TURNS rounds):
 *        AI → tool_use → parallel execute → tool_result → AI → …
 *   8. Return { reply, sources } where sources = systems actually queried
 *
 * Security:
 *   - Same-origin CSRF guard (same as /api/ai/chat)
 *   - Rate limit: 20 requests per IP per minute (agent calls are heavier)
 *   - API key read server-side (3-tier: personal cookie → workspace → env)
 *   - SF tokens from httpOnly cookies only — never in request body
 *   - Graph token from request body — validated by Graph API itself
 *   - Data scopes enforced per-role from connector_access_rules
 *   - Only Anthropic provider for agent (tool_use requires structured API)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  assertSameOrigin,
  checkRateLimit,
  getClientIp,
  readApiKey,
} from "@/lib/api-security";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTenantByDomainFromDB } from "@/lib/tenant/db";
import { getStaticTenantByDomain } from "@/lib/tenant/registry";
import { extractVerifiedEmail } from "@/lib/server/verify-msal-token";
import {
  getToolsForConnectors,
  toAnthropicTools,
} from "@/lib/connectors/tools";
import type {
  AgentConnectorConfig,
  ConnectorTool,
  ToolResult,
  AnthropicResponse,
  AnthropicToolUse,
  DataScope,
} from "@/lib/connectors/agent-types";

export const runtime = "nodejs";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_TURNS   = 5;    // maximum tool-call rounds before forcing a final answer
const MAX_TOKENS  = 2048; // max output tokens per Anthropic call

const AGENT_SYSTEM_PROMPT = `You are the EnterpriseHub AI — a cross-system intelligence layer \
that can simultaneously query multiple enterprise applications to give users holistic answers.

You have access to tools that fetch live data from connected systems (SAP, Salesforce, \
Microsoft 365, and more). When a user asks a question that can be answered with live data, \
use the appropriate tools to fetch it. You may call multiple tools in parallel in a single \
response when the question spans multiple systems.

Guidelines:
- Always use tools to fetch live data rather than guessing or fabricating figures.
- When data comes from multiple systems, synthesise it into a unified answer and cite each source.
- If a tool returns an error, acknowledge it and answer from what you do have.
- Format responses clearly: **bold** for key figures, bullet points for lists.
- Be concise. Users are busy — get to the point.
- Never invent data. If you lack access, say so directly.`;

// ─── Tenant helpers ───────────────────────────────────────────────────────────

async function getTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host")?.replace(/:\d+$/, "").toLowerCase() ?? "";
  try {
    const t = await getTenantByDomainFromDB(host);
    if (t) return t.slug;
  } catch { /* fall through */ }
  return getStaticTenantByDomain(host).slug;
}

// ─── Scope resolution ─────────────────────────────────────────────────────────

type ScopeOrder = DataScope[];
const SCOPE_ORDER: ScopeOrder = ["none", "own", "team", "all"];

function mostPermissive(scopes: DataScope[]): DataScope {
  return scopes.reduce<DataScope>(
    (best, s) =>
      SCOPE_ORDER.indexOf(s) > SCOPE_ORDER.indexOf(best) ? s : best,
    "none"
  );
}

async function resolveScope(
  tenantSlug: string,
  connectorType: string,
  userEmail: string | null
): Promise<DataScope> {
  if (!userEmail) return "own";

  const { data: userRow } = await supabaseAdmin
    .from("tenant_users")
    .select("roles")
    .eq("tenant_slug", tenantSlug)
    .eq("email", userEmail.toLowerCase())
    .maybeSingle();

  const roles: string[] = userRow?.roles ?? [];

  const SYSTEM_DEFAULTS: Record<string, DataScope> = {
    Admin:   "all",
    Manager: "team",
    Member:  "own",
  };

  const { data: rules } = await supabaseAdmin
    .from("connector_access_rules")
    .select("role, ai_enabled, data_scope")
    .eq("tenant_slug", tenantSlug)
    .eq("connector_type", connectorType);

  const ruleMap = new Map<string, { ai_enabled: boolean; data_scope: DataScope }>(
    (rules ?? []).map((r) => [
      r.role,
      { ai_enabled: r.ai_enabled, data_scope: r.data_scope as DataScope },
    ])
  );

  const effectiveScopes: DataScope[] = [];
  for (const role of roles) {
    const rule = ruleMap.get(role);
    if (rule) {
      effectiveScopes.push(rule.ai_enabled ? rule.data_scope : "none");
    } else {
      effectiveScopes.push(SYSTEM_DEFAULTS[role] ?? "own");
    }
  }

  if (effectiveScopes.length === 0) effectiveScopes.push("own");
  return mostPermissive(effectiveScopes);
}

// ─── Salesforce token resolution ──────────────────────────────────────────────

async function resolveSalesforceToken(
  configId: string,
  tenantSlug: string,
  userEmail: string | null
): Promise<{ accessToken: string; instanceUrl: string } | null> {
  const jar   = await cookies();
  const short = configId.replace(/-/g, "").slice(0, 12);

  // 1. Try cookie (fastest path — same device)
  const cookieToken    = jar.get(`sf_token_${short}`)?.value;
  const cookieInstance = jar.get(`sf_inst_${short}`)?.value;
  if (cookieToken && cookieInstance) {
    return { accessToken: cookieToken, instanceUrl: cookieInstance };
  }

  // 2. Try refresh token (cross-device / server-side)
  let refreshToken: string | null = null;
  if (userEmail) {
    try {
      const { data } = await supabaseAdmin
        .from("connector_tokens")
        .select("refresh_token")
        .eq("tenant_slug", tenantSlug)
        .eq("user_email",  userEmail)
        .eq("config_id",   configId)
        .maybeSingle();
      refreshToken = data?.refresh_token ?? null;
    } catch { /* skip */ }
  }

  if (!refreshToken) return null;

  const { data: cfg } = await supabaseAdmin
    .from("connector_configs")
    .select("instance_url, client_id, client_secret")
    .eq("id", configId)
    .single();

  if (!cfg) return null;

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     cfg.client_id,
    client_secret: cfg.client_secret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${cfg.instance_url}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; instance_url: string };
  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

// ─── Build AgentConnectorConfig for each active connector row ─────────────────

interface ConnectorRow {
  id: string;
  connector_type: string;
  instance_url: string;
  client_id: string;
  client_secret: string;
  extra_config: Record<string, unknown> | null;
}

async function buildConfigs(
  rows: ConnectorRow[],
  graphToken: string | null,
  tenantSlug: string,
  userEmail: string | null
): Promise<AgentConnectorConfig[]> {
  const configs: AgentConnectorConfig[] = [];

  // Process all connector rows
  const promises = rows.map(async (row): Promise<AgentConnectorConfig | null> => {
    const base: AgentConnectorConfig = {
      id:             row.id,
      connector_type: row.connector_type,
      instance_url:   row.instance_url,
      client_id:      row.client_id,
      client_secret:  row.client_secret,
      extra_config:   row.extra_config ?? undefined,
      userEmail:      userEmail ?? undefined,
    };

    switch (row.connector_type) {
      // SAP: basic auth — no token needed, client_id/secret are credentials
      case "sap-c4c":
        return {
          ...base,
          dataScope: await resolveScope(tenantSlug, "sap-c4c", userEmail),
        };

      // Salesforce: OAuth Bearer token
      case "salesforce": {
        const sfScope = await resolveScope(tenantSlug, "salesforce", userEmail);
        if (sfScope === "none") {
          return { ...base, dataScope: "none" }; // tools will return access-denied
        }
        const tokens = await resolveSalesforceToken(row.id, tenantSlug, userEmail);
        return {
          ...base,
          accessToken:  tokens?.accessToken,
          instance_url: tokens?.instanceUrl ?? row.instance_url,
          dataScope:    sfScope,
        };
      }

      default:
        return base;
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      configs.push(result.value);
    }
  }

  // Microsoft Graph: always active (MSAL auth, no connector_configs row)
  // Token comes from client-supplied graphToken in the request body
  if (graphToken) {
    configs.push({
      id:             "microsoft-graph",
      connector_type: "microsoft-graph",
      instance_url:   "https://graph.microsoft.com",
      client_id:      "",
      client_secret:  "",
      accessToken:    graphToken,
      userEmail:      userEmail ?? undefined,
      dataScope:      "all",
    });
  }

  return configs;
}

// ─── Build a tool→config lookup for fast dispatch ────────────────────────────

function buildToolLookup(
  tools: ConnectorTool[],
  configs: AgentConnectorConfig[]
): Map<string, { tool: ConnectorTool; config: AgentConnectorConfig }> {
  const map = new Map<string, { tool: ConnectorTool; config: AgentConnectorConfig }>();

  // Prefix → connector_type mapping for quick lookup
  const PREFIX_TO_TYPE: Record<string, string> = {
    sap:   "sap-c4c",
    sf:    "salesforce",
    graph: "microsoft-graph",
  };

  // Build config lookup by type
  const configByType = new Map<string, AgentConnectorConfig>(
    configs.map((c) => [c.connector_type, c])
  );

  for (const tool of tools) {
    const prefix    = tool.name.split("_")[0];
    const type      = PREFIX_TO_TYPE[prefix];
    const config    = type ? configByType.get(type) : undefined;
    if (config) {
      map.set(tool.name, { tool, config });
    }
  }
  return map;
}

// ─── Anthropic API call ───────────────────────────────────────────────────────

type AnthropicMessageContent =
  | string
  | Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    } | {
      type: "text";
      text: string;
    } | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: AnthropicMessageContent;
}

async function callAnthropic(
  key: string,
  messages: AnthropicMessage[],
  tools: ReturnType<typeof toAnthropicTools>
): Promise<AnthropicResponse> {
  const body = {
    model:      "claude-opus-4-5",
    max_tokens: MAX_TOKENS,
    system:     AGENT_SYSTEM_PROMPT,
    tools,
    messages,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<AnthropicResponse>;
}

// ─── Main orchestration loop ──────────────────────────────────────────────────

async function runAgentLoop(
  key: string,
  userMessage: string,
  conversationHistory: AnthropicMessage[],
  tools: ConnectorTool[],
  toolLookup: Map<string, { tool: ConnectorTool; config: AgentConnectorConfig }>
): Promise<{ reply: string; sources: string[] }> {
  const anthropicTools = toAnthropicTools(tools);
  const messages: AnthropicMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const sources = new Set<string>();
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await callAnthropic(key, messages, anthropicTools);

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    // Terminal: AI is done
    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
      return { reply: text, sources: Array.from(sources) };
    }

    // Tool use: execute all requested tools in parallel
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is AnthropicToolUse => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // Shouldn't happen, but guard against infinite loop
        break;
      }

      // Execute all tool calls in parallel
      const toolResults = await Promise.allSettled(
        toolUseBlocks.map(async (block) => {
          const entry = toolLookup.get(block.name);
          if (!entry) {
            return {
              id: block.id,
              result: {
                success: false,
                error: `Unknown tool: ${block.name}`,
                source: "system",
                tool: block.name,
              } satisfies ToolResult,
            };
          }

          const result = await entry.tool.execute(block.input, entry.config);
          return { id: block.id, result };
        })
      );

      // Build tool_result message
      const resultContent: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
        is_error?: boolean;
      }> = [];

      for (const settled of toolResults) {
        if (settled.status === "rejected") continue;
        const { id, result } = settled.value;

        if (result.success) {
          sources.add(result.source);
          resultContent.push({
            type:        "tool_result",
            tool_use_id: id,
            content:     JSON.stringify(result.data),
          });
        } else {
          resultContent.push({
            type:        "tool_result",
            tool_use_id: id,
            content:     result.error ?? "Tool failed with no error message.",
            is_error:    true,
          });
        }
      }

      messages.push({ role: "user", content: resultContent });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  // Fallback: extract any text we have
  const lastText = messages
    .filter((m) => m.role === "assistant")
    .flatMap((m) =>
      Array.isArray(m.content)
        ? (m.content as Array<{ type: string; text?: string }>)
            .filter((b) => b.type === "text")
            .map((b) => b.text ?? "")
        : [m.content as string]
    )
    .join("\n");

  return {
    reply: lastText || "I reached the maximum number of tool-call rounds. Please try rephrasing your question.",
    sources: Array.from(sources),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── CSRF guard ──────────────────────────────────────────────────────────────
  const csrfError = assertSameOrigin(req);
  if (csrfError) return csrfError;

  // ── Rate limit — 20 agent calls per IP per minute ───────────────────────────
  const ip           = getClientIp(req);
  const rateLimitErr = checkRateLimit(`ai:agent:${ip}`, 20, 60_000);
  if (rateLimitErr) return rateLimitErr;

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, conversationHistory, graphToken } = body;

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: "message too long (max 8000 chars)" }, { status: 400 });
  }

  // Validate conversationHistory shape if provided
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (Array.isArray(conversationHistory)) {
    for (const turn of conversationHistory.slice(-10)) { // last 10 turns only
      if (
        turn &&
        typeof turn === "object" &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string"
      ) {
        history.push({ role: turn.role, content: turn.content });
      }
    }
  }

  // ── Resolve identity + tenant ───────────────────────────────────────────────
  const userEmail  = await extractVerifiedEmail(req);
  const tenantSlug = await getTenantSlug(req);

  // ── Read Anthropic API key (3-tier: personal cookie → workspace → env) ──────
  const personalKey  = await readApiKey("anthropic");
  const workspaceKey = await getWorkspaceAnthropicKey(req, tenantSlug);
  const envKey       = process.env.ANTHROPIC_API_KEY ?? null;
  const apiKey       = personalKey ?? workspaceKey ?? envKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No Anthropic API key configured. " +
          "The agent requires Anthropic (Claude) — add a key in Settings → AI.",
      },
      { status: 401 }
    );
  }

  // ── Load active connector configs for this tenant ───────────────────────────
  let connectorRows: ConnectorRow[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("connector_configs")
      .select("id, connector_type, instance_url, client_id, client_secret, extra_config")
      .eq("tenant_slug", tenantSlug)
      .eq("is_active", true);
    connectorRows = (data ?? []) as ConnectorRow[];
  } catch (err) {
    console.error("[/api/ai/agent] failed to load connector_configs:", err);
    // Non-fatal — proceed with Graph only (if token provided)
  }

  // ── Build AgentConnectorConfig[] with resolved tokens ──────────────────────
  const safeGraphToken =
    typeof graphToken === "string" && graphToken.length > 0 ? graphToken : null;

  const configs = await buildConfigs(
    connectorRows,
    safeGraphToken,
    tenantSlug,
    userEmail
  );

  // ── Get tools for active connectors ─────────────────────────────────────────
  const activeTypes = Array.from(new Set(configs.map((c) => c.connector_type)));
  const tools       = getToolsForConnectors(activeTypes);

  if (tools.length === 0) {
    // No connectors — fall back to a plain chat response
    return NextResponse.json({
      reply:
        "No connectors are currently active. Connect your enterprise systems in " +
        "Settings → Connectors to enable cross-system AI.",
      sources: [],
    });
  }

  // ── Build tool→config lookup ─────────────────────────────────────────────────
  const toolLookup = buildToolLookup(tools, configs);

  // ── Run agent loop ───────────────────────────────────────────────────────────
  try {
    const { reply, sources } = await runAgentLoop(
      apiKey,
      message,
      history,
      tools,
      toolLookup
    );

    return NextResponse.json({ reply, sources });
  } catch (err) {
    console.error("[/api/ai/agent] orchestration error:", err);
    return NextResponse.json(
      { error: "Agent failed. Check your Anthropic API key and try again." },
      { status: 502 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getWorkspaceAnthropicKey(
  req: NextRequest,
  tenantSlug: string
): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("ai_keys")
      .eq("slug", tenantSlug)
      .maybeSingle();

    const aiKeys = (data?.ai_keys ?? {}) as Record<string, string>;
    return aiKeys["anthropic"] ?? null;
  } catch {
    return null;
  }
}
