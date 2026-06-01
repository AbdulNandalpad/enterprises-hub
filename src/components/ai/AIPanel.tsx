"use client";

/**
 * AIPanel — the in-workspace AI chat interface.
 *
 * Three layout modes driven by AIContext config.panelPosition:
 *   right    — docked panel, fixed to the right edge (w-80)
 *   floating — draggable free-floating window
 *   bottom   — collapsed bar at the bottom, expands on click
 *
 * Calls /api/ai/chat; API key stays server-side in a httpOnly cookie.
 * Injects Microsoft Graph context (calendar, profile) when available.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useAI } from "@/contexts/AIContext";
import { useGraphContext } from "@/lib/connectors/graph/useGraphContext";
import { useTeamsContext } from "@/lib/connectors/teams/useTeamsContext";
import { useImapContext } from "@/lib/connectors/imap/useImapContext";
import { FunctionChips } from "./FunctionChips";
import { IconX, IconSparkle, IconArrowRight } from "@/components/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant" | "error";

interface Message {
  id: string;
  role: Role;
  content: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Lightweight markdown renderer ───────────────────────────────────────────

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const t = match[0];
    if (t.startsWith("**"))
      parts.push(<strong key={key++} className="font-semibold">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`"))
      parts.push(<code key={key++} className="font-mono text-[0.8em] bg-black/10 dark:bg-white/10 px-1 rounded">{t.slice(1, -1)}</code>);
    else
      parts.push(<em key={key++}>{t.slice(1, -1)}</em>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render a full assistant message — headings, bullets, numbered lists, paragraphs */
function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → small gap
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h3) { nodes.push(<p key={i} className="font-semibold text-[0.8rem] uppercase tracking-wide mt-1">{renderInline(h3[1])}</p>); i++; continue; }
    if (h2) { nodes.push(<p key={i} className="font-semibold mt-1">{renderInline(h2[1])}</p>); i++; continue; }
    if (h1) { nodes.push(<p key={i} className="font-bold mt-1">{renderInline(h1[1])}</p>); i++; continue; }

    // Bullet list
    const bullet = line.match(/^[-•*]\s+(.*)/);
    if (bullet) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-•*]\s+(.*)/)) {
        const m = lines[i].match(/^[-•*]\s+(.*)/);
        items.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="select-none mt-[0.15rem] flex-shrink-0 text-[var(--text-muted)]">•</span>
            <span>{renderInline(m![1])}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-0.5 my-0.5">{items}</ul>);
      continue;
    }

    // Numbered list
    const numbered = line.match(/^(\d+)\.\s+(.*)/);
    if (numbered) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+(.*)/)) {
        const m = lines[i].match(/^(\d+)\.\s+(.*)/);
        items.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="select-none flex-shrink-0 text-[var(--text-muted)] min-w-[1.2rem]">{m![1]}.</span>
            <span>{renderInline(m![2])}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-0.5 my-0.5">{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-[var(--shell-border)] my-1" />);
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5 leading-relaxed">{nodes}</div>;
}

// ─── Inner components ─────────────────────────────────────────────────────────

function MessageList({
  messages,
  loading,
  endRef,
}: {
  messages: Message[];
  loading: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words ${
              m.role === "user"
                ? "bg-[var(--navy)] text-white rounded-br-sm leading-relaxed whitespace-pre-wrap"
                : m.role === "error"
                ? "bg-[var(--red-bg)] text-[var(--red-status)] border border-[var(--red-border)] rounded-bl-sm leading-relaxed whitespace-pre-wrap"
                : "bg-[var(--shell-bg)] text-[var(--text-primary)] border border-[var(--shell-border)] rounded-bl-sm"
            }`}
          >
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
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  loading,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t border-[var(--shell-border)] px-3 py-2.5 flex gap-2 items-end flex-shrink-0">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={disabled ? "Configure an API key in Settings → AI" : "Ask anything…"}
        disabled={disabled || loading}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
        style={{ minHeight: "1.5rem" }}
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || loading || disabled}
        aria-label="Send"
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--navy)] text-white hover:bg-[var(--navy-hover)] disabled:opacity-40 transition-colors"
      >
        <IconArrowRight size={13} />
      </button>
    </div>
  );
}

// ─── Main hook: message logic ─────────────────────────────────────────────────

function useChat() {
  const { config, keyConfigured } = useAI();
  const { buildContext: buildGraphContext }  = useGraphContext();
  const { buildContext: buildTeamsContext }  = useTeamsContext();
  const { buildContext: buildImapContext }   = useImapContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your ${config.panelLabel || "AI Assistant"}. I have context from your connected accounts. How can I help?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setLoading(true);

    // Gather all connector contexts in parallel (best-effort — never blocks the send)
    const [graphCtx, teamsCtx, imapCtx] = await Promise.all([
      buildGraphContext().catch(() => undefined),
      buildTeamsContext().catch(() => undefined),
      buildImapContext().catch(() => undefined),
    ]);

    // Merge all non-empty context blocks
    const ctx = [graphCtx, teamsCtx, imapCtx]
      .filter((c): c is string => Boolean(c))
      .join("\n\n") || undefined;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          provider: config.provider,
          model: config.model,
          systemAddition: config.systemPromptAddition || undefined,
          context: ctx,
          azureEndpoint:   config.azureEndpoint   || undefined,
          azureDeployment: config.azureDeployment  || undefined,
          customBaseUrl:   config.customBaseUrl    || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: data.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "error", content: (e as Error).message },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, buildGraphContext, buildTeamsContext, buildImapContext]);

  /** Activate a named AI Function — injects trigger + result into the chat thread */
  const activateFunction = useCallback(async (functionId: string, label: string) => {
    if (loading) return;
    setLoading(true);
    // Show a "user" trigger bubble
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: `▶ ${label}` },
    ]);
    try {
      // We need the result from useAIFunction but we can't use the hook's state here
      // (hooks can't be called conditionally). So we call the API directly.
      const [graphCtx, teamsCtx, imapCtx] = await Promise.all([
        buildGraphContext().catch(() => undefined),
        buildTeamsContext().catch(() => undefined),
        buildImapContext().catch(() => undefined),
      ]);
      const context =
        [graphCtx, teamsCtx, imapCtx]
          .filter((c): c is string => Boolean(c))
          .join("\n\n") || undefined;

      const res = await fetch("/api/ai/function", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionId,
          provider:        config.provider,
          model:           config.model,
          context,
          azureEndpoint:   config.azureEndpoint   || undefined,
          azureDeployment: config.azureDeployment  || undefined,
          customBaseUrl:   config.customBaseUrl    || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Function failed");
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: data.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "error", content: (e as Error).message },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, config, buildGraphContext, buildTeamsContext, buildImapContext]);

  return { messages, input, setInput, loading, send, activateFunction, keyConfigured };
}

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  label,
  onClear,
  dragProps,
}: {
  label: string;
  onClear: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-[var(--shell-border)] flex-shrink-0 bg-[var(--ai-bg)] ${
        dragProps ? "cursor-grab active:cursor-grabbing select-none" : ""
      }`}
      {...dragProps}
    >
      <IconSparkle size={13} className="text-[var(--ai-accent)]" />
      <span className="flex-1 text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      <button
        onClick={onClear}
        title="Clear chat"
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <IconX size={13} />
      </button>
    </div>
  );
}

// ─── Position variants ────────────────────────────────────────────────────────

/** Docked to the right edge */
function PanelRight() {
  const { config } = useAI();
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured } = useChat();
  const [msgs, setMsgs] = useState(messages);
  const endRef = useRef<HTMLDivElement>(null);

  // sync messages into local state for the clear button
  useEffect(() => setMsgs(messages), [messages]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-80 flex flex-col bg-[var(--shell-surface)] border-l border-[var(--shell-border)] z-30">
      <PanelHeader
        label={config.panelLabel || "AI Assistant"}
        onClear={() => setMsgs([{ id: uid(), role: "assistant", content: "Chat cleared. How can I help?" }])}
      />
      <MessageList messages={msgs} loading={loading} endRef={endRef} />
      <FunctionChips onActivate={activateFunction} disabled={loading || !keyConfigured} />
      <ChatInput value={input} onChange={setInput} onSend={send} loading={loading} disabled={!keyConfigured} />
    </aside>
  );
}

/** Draggable floating window */
function PanelFloating() {
  const { config } = useAI();
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);

  // Position in viewport coords (null = use default CSS position)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef({ active: false, startMX: 0, startMY: 0, startPX: 0, startPY: 0 });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function onMouseDown(e: React.MouseEvent) {
    const el = (e.currentTarget as HTMLElement).closest("[data-float]") as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = { active: true, startMX: e.clientX, startMY: e.clientY, startPX: rect.left, startPY: rect.top };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startMX;
    const dy = e.clientY - drag.current.startMY;
    setPos({ x: drag.current.startPX + dx, y: drag.current.startPY + dy });
  }

  function onMouseUp() {
    drag.current.active = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--navy)] text-white text-xs font-semibold shadow-lg hover:bg-[var(--navy-hover)] transition-colors"
    >
      <IconSparkle size={12} />
      {config.panelLabel || "AI Assistant"}
    </button>
  );

  const style: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y }
    : { position: "fixed", right: 24, bottom: 24 };

  return (
    <div
      data-float
      style={{ ...style, width: 340, height: 480, zIndex: 50 }}
      className="flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-xl overflow-hidden"
    >
      <PanelHeader
        label={config.panelLabel || "AI Assistant"}
        onClear={() => setOpen(false)}
        dragProps={{ onMouseDown }}
      />
      <MessageList messages={messages} loading={loading} endRef={endRef} />
      <FunctionChips onActivate={activateFunction} disabled={loading || !keyConfigured} />
      <ChatInput value={input} onChange={setInput} onSend={send} loading={loading} disabled={!keyConfigured} />
    </div>
  );
}

/** Collapsed bottom bar — click to expand */
function PanelBottom() {
  const { config } = useAI();
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured } = useChat();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  return (
    <div className="fixed bottom-0 right-6 z-50 w-80 flex flex-col rounded-t-xl border border-b-0 border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-xl overflow-hidden">
      {/* Collapsed / expanded header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2.5 bg-[var(--ai-bg)] border-b border-[var(--shell-border)] w-full text-left"
      >
        <IconSparkle size={13} className="text-[var(--ai-accent)]" />
        <span className="flex-1 text-xs font-semibold text-[var(--text-primary)]">
          {config.panelLabel || "AI Assistant"}
        </span>
        <span className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <IconArrowRight size={13} style={{ transform: "rotate(-90deg)" }} />
        </span>
      </button>

      {open && (
        <>
          <MessageList messages={messages} loading={loading} endRef={endRef} />
          <FunctionChips onActivate={activateFunction} disabled={loading || !keyConfigured} />
          <ChatInput value={input} onChange={setInput} onSend={send} loading={loading} disabled={!keyConfigured} />
        </>
      )}
    </div>
  );
}

// ─── Root export — picks variant by config.panelPosition ─────────────────────

export default function AIPanel() {
  const { config } = useAI();

  if (config.panelPosition === "right")    return <PanelRight />;
  if (config.panelPosition === "floating") return <PanelFloating />;
  return <PanelBottom />;
}
