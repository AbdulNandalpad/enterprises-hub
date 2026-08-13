/**
 * Model-provider abstraction (day-1 rigor list): product code never calls
 * a vendor SDK directly. Claude / Azure OpenAI implementations arrive in
 * Phase 3 behind this interface; per-tenant selection later.
 */
export interface ToolCallRequest {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools: { name: string; description: string; parameters: Record<string, unknown> }[];
}

export type ProviderReply =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> };

export interface ModelProvider {
  readonly id: string;
  complete(req: ToolCallRequest): Promise<ProviderReply>;
}
