/**
 * AI Functions — types.
 *
 * An AIFunction is a named, pre-built AI job that the user activates with
 * one click. The function has a fixed system prompt + a user prompt template.
 * Connector contexts (calendar, email, Teams) are injected automatically.
 */

import type { IconComponent } from "@/components/icons";

export type ConnectorId = "microsoft-graph" | "microsoft-teams" | "imap-email";
export type FunctionCategory = "briefing" | "email" | "meetings" | "productivity";

export interface AIFunction {
  id: string;
  name: string;
  /** One line — shown in the chip and widget header */
  description: string;
  Icon: IconComponent;
  category: FunctionCategory;
  /** Which connectors must be active to produce useful output */
  requiredConnectors: ConnectorId[];
  /** System prompt sent to the LLM */
  systemPrompt: string;
  /** User-turn message — usually a short trigger phrase */
  userPrompt: string;
}
