"use client";

/**
 * AdminPlaybook — the EnterpriseHub Product Intelligence section.
 *
 * Renders the full playbook in a searchable, section-tabbed layout.
 * Includes an AI Expert chat panel powered by /api/ai/expert — the AI
 * has the entire playbook as its system context and can answer product,
 * technical, and sales questions for EnterpriseHub staff.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { SectionCard, Insight } from "./AdminUI";
import {
  PLAYBOOK_SECTIONS,
  entriesForSection,
  type PlaybookSection,
  type PlaybookEntry,
} from "@/content/playbook";
import {
  IconSparkle, IconArrowRight, IconSearch, IconBookOpen,
  IconShield, IconPlug, IconBolt, IconUsers, IconGear,
  IconInfo,
} from "@/components/icons";
import { MarkdownMessage } from "@/components/MarkdownMessage";

// ─── Section icons ────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<PlaybookSection, React.ComponentType<{ size?: number; className?: string }>> = {
  "Product":        IconInfo,
  "Identity":       IconShield,
  "Connectors":     IconPlug,
  "AI Architecture":IconBolt,
  "Sales":          IconUsers,
  "Setup":          IconGear,
};

const SECTION_COLORS: Record<PlaybookSection, string> = {
  "Product":         "var(--admin)",
  "Identity":        "var(--blue)",
  "Connectors":      "var(--active-text)",
  "AI Architecture": "var(--ai-accent)",
  "Sales":           "var(--green-status)",
  "Setup":           "var(--text-secondary)",
};

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, color }: { entry: PlaybookEntry; color: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--shell-border)] rounded-lg overflow-hidden bg-[var(--shell-surface)]">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--hover-bg)] transition-colors"
      >
        <span
          className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
          style={{ background: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
            {entry.title}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[var(--shell-bg)] text-[var(--text-muted)] border border-[var(--shell-border)] leading-none"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span
          className={`text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200 mt-1 ${open ? "rotate-90" : ""}`}
        >
          <IconArrowRight size={12} />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--shell-border)] bg-[var(--shell-bg)]">
          <MarkdownMessage content={entry.body} />
        </div>
      )}
    </div>
  );
}

// ─── AI Expert chat ───────────────────────────────────────────────────────────

type ChatRole = "user" | "assistant" | "error";

interface ChatMessage {
  id:      string;
  role:    ChatRole;
  content: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const STARTER_QUESTIONS = [
  "How does principal propagation work with SAP and Azure AD?",
  "Customer has no IdP — how does EnterpriseHub help them?",
  "How do I handle the 'we already have SAP Joule' objection?",
  "What's the difference between per-user OAuth and a service account?",
  "A prospect asks about data security — what do I say?",
];

function AIExpert() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id:      "welcome",
      role:    "assistant",
      content: "I'm the EnterpriseHub Product Expert. I have full knowledge of the product architecture, integration patterns, identity scenarios, and sales positioning. Ask me anything — I'm here to help you prepare for customer conversations.",
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: msg }]);
    setLoading(true);

    try {
      const res  = await fetch("/api/ai/expert", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { id: uid(), role: "error", content: (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex flex-col h-[520px] border border-[var(--admin-border)] rounded-lg overflow-hidden bg-[var(--shell-surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--admin-bg)] border-b border-[var(--admin-border)] flex-shrink-0">
        <IconSparkle size={13} className="text-[var(--admin)]" />
        <span className="text-xs font-semibold text-[var(--admin)]">Product Expert AI</span>
        <span className="ml-auto font-mono text-[9px] text-[var(--admin)] opacity-60 uppercase tracking-wider">Admin only</span>
      </div>

      {/* Starter questions */}
      {messages.length <= 1 && (
        <div className="px-3 py-3 flex flex-wrap gap-1.5 border-b border-[var(--shell-border)] flex-shrink-0 bg-[var(--shell-bg)]">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="text-[10px] px-2.5 py-1 rounded-full border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin)] hover:bg-[var(--admin-border)] transition-colors disabled:opacity-50 leading-none"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] px-3 py-2 rounded-xl text-sm break-words ${
              m.role === "user"
                ? "bg-[var(--admin)] text-white rounded-br-sm whitespace-pre-wrap"
                : m.role === "error"
                ? "bg-[var(--red-bg)] text-[var(--red-status)] border border-[var(--red-border)] rounded-bl-sm whitespace-pre-wrap"
                : "bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-primary)] rounded-bl-sm"
            }`}>
              {m.role === "assistant" ? <MarkdownMessage content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-xl rounded-bl-sm px-3 py-2.5 flex gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--shell-border)] px-3 py-2.5 flex gap-2 items-end flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about architecture, connectors, identity, sales positioning…"
          disabled={loading}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none leading-relaxed max-h-24 overflow-y-auto disabled:opacity-50"
          style={{ minHeight: "1.5rem" }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--admin)] text-white disabled:opacity-40 transition-colors"
        >
          <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPlaybook() {
  const [activeSection, setActiveSection] = useState<PlaybookSection>("Product");
  const [search, setSearch]               = useState("");

  const Icon  = SECTION_ICONS[activeSection];
  const color = SECTION_COLORS[activeSection];

  // Filter entries by search query across all sections
  const allEntries = PLAYBOOK_SECTIONS.flatMap((s) => entriesForSection(s));
  const searchResults = search.trim().length >= 2
    ? allEntries.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.body.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.includes(search.toLowerCase()))
      )
    : null;

  const displayEntries = searchResults ?? entriesForSection(activeSection);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Product Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Architecture, identity patterns, connector matrix, and sales playbook. Visible to admins only.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)]" />

      <Insight
        admin
        text={
          <>
            <strong className="text-[var(--admin)]">This is the secret sauce.</strong>{" "}
            Everything here defines how EnterpriseHub works, what makes it different, and how to
            position it. Use the Product Expert AI below to prepare for any customer conversation.
          </>
        }
      />

      {/* AI Expert */}
      <SectionCard title="Product Expert AI" action={
        <span className="font-mono text-[9px] text-[var(--admin)] uppercase tracking-wider border border-[var(--admin-border)] px-2 py-0.5 rounded">
          Powered by Playbook
        </span>
      }>
        <div className="p-4">
          <AIExpert />
        </div>
      </SectionCard>

      {/* Search */}
      <div className="relative">
        <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search playbook…"
          className="w-full pl-8 pr-4 py-2 text-sm bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--admin-border)]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        )}
      </div>

      {/* Section tabs (hidden during search) */}
      {!searchResults && (
        <div className="flex flex-wrap gap-1.5">
          {PLAYBOOK_SECTIONS.map((section) => {
            const SectionIcon = SECTION_ICONS[section];
            const sectionColor = SECTION_COLORS[section];
            const active = section === activeSection;
            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin)]"
                    : "border-[var(--shell-border)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                }`}
              >
                <SectionIcon
                  size={11}
                  className={active ? "text-[var(--admin)]" : "text-[var(--text-muted)]"}
                />
                {section}
                <span className={`font-mono text-[9px] px-1 py-0.5 rounded leading-none ${
                  active ? "bg-[var(--admin-border)] text-[var(--admin)]" : "bg-[var(--shell-border)] text-[var(--text-muted)]"
                }`}>
                  {entriesForSection(section).length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Entries */}
      <div>
        {searchResults ? (
          <div className="mb-3 text-xs text-[var(--text-muted)]">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{search}"
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color }} className="flex-shrink-0 leading-none">
              <Icon size={14} />
            </span>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{activeSection}</h2>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {displayEntries.length} entries
            </span>
          </div>
        )}

        {displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <IconBookOpen size={24} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No entries found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                color={SECTION_COLORS[entry.section as PlaybookSection] ?? color}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
