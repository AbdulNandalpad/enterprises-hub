"use client";

/**
 * AIPanel — the in-workspace AI chat interface.
 *
 * Three layout modes driven by AIContext config.panelPosition:
 *   right    — docked panel, fixed to the right edge (w-80)
 *   floating — draggable free-floating window
 *   bottom   — collapsed bar at the bottom, expands on click
 *
 * Routing:
 *   Anthropic (claude-*) → /api/ai/agent  — cross-system tool-use loop
 *   All other providers  → /api/ai/chat   — static context injection
 *
 * For the agent path the Graph MSAL token is forwarded server-side so the
 * agent can query Microsoft 365 directly alongside SAP and Salesforce.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useAI } from "@/contexts/AIContext";
import { useAllContexts } from "@/lib/connectors/useAllContexts";
import { useGraphToken } from "@/lib/connectors/graph/useGraphToken";
import { FunctionChips } from "./FunctionChips";
import { IconX, IconSparkle, IconArrowRight, IconTrash } from "@/components/icons";
import { MarkdownMessage } from "@/components/MarkdownMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant" | "error";

interface Message {
  id: string;
  role: Role;
  content: string;
  /** Source systems queried for this response (agent mode only) */
  sources?: string[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

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
          className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
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
          {/* Source attribution chips — shown below agent responses */}
          {m.role === "assistant" && m.sources && m.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-w-[85%]">
              {m.sources.map((src) => (
                <span
                  key={src}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--active-bg)] text-[var(--active-text)] border border-[var(--active-text)]/20 leading-none"
                >
                  {src}
                </span>
              ))}
            </div>
          )}
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

/** Conversation history for the agent — last N user/assistant turns */
const MAX_HISTORY = 6;

function useChat() {
  const { config, keyConfigured } = useAI();
  const { buildContext } = useAllContexts();
  const { getToken: getGraphToken } = useGraphToken();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your ${config.panelLabel || "AI Assistant"}. I can query your connected systems — SAP, Salesforce, Microsoft 365 and more — simultaneously to give you a complete picture. Just ask.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep a rolling history for multi-turn agent conversations
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    setLoading(true);

    // ── Route: Anthropic → agent endpoint (tool-use loop)
    //          Everything else → chat endpoint (static context injection)
    const useAgent = config.provider === "anthropic";

    try {
      if (useAgent) {
        // ── Agent path: let the AI decide what to query ──────────────────────
        const graphToken = await getGraphToken();

        const res = await fetch("/api/ai/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationHistory: historyRef.current.slice(-MAX_HISTORY),
            graphToken: graphToken ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Agent request failed");

        const assistantMsg: Message = {
          id:      uid(),
          role:    "assistant",
          content: data.reply,
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Update history for next turn
        historyRef.current = [
          ...historyRef.current,
          { role: "user"      as const, content: text        },
          { role: "assistant" as const, content: data.reply  },
        ].slice(-MAX_HISTORY * 2);

      } else {
        // ── Chat path: static context from all connected hooks ────────────────
        const { context: ctx } = await buildContext();

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            provider: config.provider,
            model:    config.model,
            systemAddition: config.systemPromptAddition || undefined,
            context:        ctx,
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
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "error", content: (e as Error).message },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, config, buildContext, getGraphToken]);

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
      const { context } = await buildContext();

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
  }, [loading, config, buildContext]);

  const clearChat = useCallback(() => {
    historyRef.current = [];
    return [{ id: uid(), role: "assistant" as Role, content: "Chat cleared. How can I help?" }];
  }, []);

  return { messages, input, setInput, loading, send, activateFunction, keyConfigured, clearChat };
}

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  label,
  onClear,
  onClose,
  dragProps,
}: {
  label: string;
  onClear: () => void;
  onClose?: () => void;
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
      {/* Clear chat */}
      <button
        onClick={onClear}
        title="Clear chat"
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
      >
        <IconTrash size={13} />
      </button>
      {/* Close panel */}
      {onClose && (
        <button
          onClick={onClose}
          title="Close AI panel"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
        >
          <IconX size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Position variants ────────────────────────────────────────────────────────

/** Docked to the right edge */
function PanelRight() {
  const { config, panelOpen, setPanelOpen } = useAI();
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured, clearChat } = useChat();
  const [msgs, setMsgs] = useState(messages);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMsgs(messages), [messages]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  // When closed, show a small floating bubble to reopen (desktop only — panel is hidden md:flex)
  if (!panelOpen) {
    return (
      <button
        onClick={() => setPanelOpen(true)}
        title="Open AI Assistant"
        className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2 px-3 py-2 rounded-full bg-[var(--navy)] text-white text-xs font-semibold shadow-lg hover:bg-[var(--navy-hover)] transition-colors"
      >
        <IconSparkle size={12} />
        {config.panelLabel || "AI Assistant"}
      </button>
    );
  }

  return (
    <aside className="fixed top-14 right-0 bottom-0 w-80 flex flex-col bg-[var(--shell-surface)] border-l border-[var(--shell-border)] z-30 hidden md:flex">
      <PanelHeader
        label={config.panelLabel || "AI Assistant"}
        onClear={() => setMsgs(clearChat())}
        onClose={() => setPanelOpen(false)}
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
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured, clearChat } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState(messages);

  useEffect(() => setMsgs(messages), [messages]);

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
      className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2 px-3 py-2 rounded-full bg-[var(--navy)] text-white text-xs font-semibold shadow-lg hover:bg-[var(--navy-hover)] transition-colors"
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
      className="hidden md:flex flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-xl overflow-hidden"
    >
      <PanelHeader
        label={config.panelLabel || "AI Assistant"}
        onClear={() => setMsgs(clearChat())}
        onClose={() => setOpen(false)}
        dragProps={{ onMouseDown }}
      />
      <MessageList messages={msgs} loading={loading} endRef={endRef} />
      <FunctionChips onActivate={activateFunction} disabled={loading || !keyConfigured} />
      <ChatInput value={input} onChange={setInput} onSend={send} loading={loading} disabled={!keyConfigured} />
    </div>
  );
}

/** Collapsed bottom bar — click to expand */
function PanelBottom() {
  const { config } = useAI();
  const { messages, input, setInput, loading, send, activateFunction, keyConfigured, clearChat } = useChat();
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  return (
    <div
      className="fixed bottom-0 right-0 sm:right-6 z-50 w-full sm:w-80 flex flex-col rounded-none sm:rounded-t-xl border border-b-0 border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-xl overflow-hidden"
      style={{ maxHeight: open ? "70vh" : undefined }}
    >
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
