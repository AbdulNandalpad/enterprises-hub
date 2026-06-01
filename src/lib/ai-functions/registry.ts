/**
 * AI Functions — built-in registry.
 *
 * Each entry is a named, one-click AI job. The system/user prompts are fixed;
 * connector context (calendar, email, Teams) is injected at call time.
 *
 * Add custom functions here — they automatically appear as chips in the AI
 * panel and are available to widgets.
 */

import {
  IconSunrise,
  IconMail,
  IconCalendar,
  IconUsers,
  IconClock,
} from "@/components/icons";
import type { AIFunction } from "./types";

export const AI_FUNCTIONS: AIFunction[] = [
  // ─── Briefing ──────────────────────────────────────────────────────────────

  {
    id: "morning-briefing",
    name: "Morning Briefing",
    description: "Day overview — calendar, emails, priorities",
    Icon: IconSunrise,
    category: "briefing",
    requiredConnectors: ["microsoft-graph"],
    systemPrompt: `You are a professional executive assistant delivering a crisp morning briefing.
Your output must be well-structured with clear sections.
Use the connected context provided to give factual, specific information.
Format: brief header summary (2 sentences), then sections for Meetings, Key Emails (if available), and Top Priorities.
Keep it scannable — bullet points, no waffle. Never fabricate data.`,
    userPrompt: "Give me my morning briefing for today. Summarise my calendar, highlight urgent emails if available, and suggest my top 3 priorities.",
  },

  // ─── Email ─────────────────────────────────────────────────────────────────

  {
    id: "email-digest",
    name: "Email Digest",
    description: "Summarise inbox — highlights, actions, urgency",
    Icon: IconMail,
    category: "email",
    requiredConnectors: ["imap-email"],
    systemPrompt: `You are an email triage assistant. Your job is to summarise a user's recent emails concisely.
Group by: Urgent / Action Required, FYI / No action, and Other.
For each email, one line: sender, subject, one-sentence summary.
Flag any deadlines, requests directed at the user, or escalations.
Never fabricate email content — only use what is provided in the context.`,
    userPrompt: "Summarise my recent emails. Highlight anything urgent, flag action items, and group the rest by priority.",
  },

  // ─── Meetings ─────────────────────────────────────────────────────────────

  {
    id: "meeting-prep",
    name: "Meeting Prep",
    description: "Prep notes for today's meetings",
    Icon: IconCalendar,
    category: "meetings",
    requiredConnectors: ["microsoft-graph"],
    systemPrompt: `You are a meeting preparation assistant. For each meeting on the user's calendar today,
produce a short prep card: meeting name, attendees, duration, and 2–3 suggested talking points or questions.
If Teams chat context is available, incorporate any relevant recent discussion.
Keep each prep card to 5 lines maximum. Never fabricate attendee names or discussion content.`,
    userPrompt: "Help me prepare for my meetings today. For each meeting, give me a quick prep card with context and talking points.",
  },

  {
    id: "teams-catchup",
    name: "Teams Catch-up",
    description: "What happened in Teams while you were away",
    Icon: IconUsers,
    category: "meetings",
    requiredConnectors: ["microsoft-teams"],
    systemPrompt: `You are a workplace communication assistant. Summarise what has happened in the user's messaging channels and chats based on the provided context.
Group by: Channels needing a response, Active discussions, Announcements/FYI.
Be specific — quote the channel or chat name as it appears in the context. Flag any messages directed at the user by name.
Never fabricate messages. If no messaging context is available, say so clearly.`,
    userPrompt: "Catch me up on Teams. What conversations need my attention, what were the key announcements, and what can I safely ignore?",
  },

  // ─── Productivity ─────────────────────────────────────────────────────────

  {
    id: "end-of-day",
    name: "End of Day",
    description: "Day wrap-up and tomorrow's plan",
    Icon: IconClock,
    category: "productivity",
    requiredConnectors: ["microsoft-graph"],
    systemPrompt: `You are a productivity coach. Help the user wrap up their workday and plan tomorrow.
Based on the calendar context provided:
1. Summarise today in 2–3 sentences (meetings attended, visible accomplishments).
2. List any carry-overs or open items visible from context.
3. Suggest 3 priorities for tomorrow based on the upcoming calendar.
Be concise and actionable. Never fabricate data not present in context.`,
    userPrompt: "It's end of day. Give me a quick wrap-up of today and help me plan the 3 most important things for tomorrow.",
  },
];

/** Look up a function by ID — returns undefined if not found */
export function getAIFunction(id: string): AIFunction | undefined {
  return AI_FUNCTIONS.find((f) => f.id === id);
}
