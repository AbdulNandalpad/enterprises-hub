"use client";

/**
 * useAIFunction — runs a named AI Function against the user's live connector context.
 *
 * Usage:
 *   const { run, result, loading, error, reset } = useAIFunction();
 *   await run("morning-briefing");
 */

import { useState, useCallback } from "react";
import { useAI } from "@/contexts/AIContext";
import { useGraphContext } from "@/lib/connectors/graph/useGraphContext";
import { useTeamsContext } from "@/lib/connectors/teams/useTeamsContext";
import { useImapContext } from "@/lib/connectors/imap/useImapContext";
import type { AIFunction } from "./types";

interface UseFunctionState {
  result: string | null;
  loading: boolean;
  error: string | null;
  /** The function that was last run */
  activeFn: AIFunction | null;
}

interface UseFunctionReturn extends UseFunctionState {
  run: (functionId: string) => Promise<void>;
  reset: () => void;
}

export function useAIFunction(): UseFunctionReturn {
  const { config } = useAI();
  const { buildContext: buildGraphContext } = useGraphContext();
  const { buildContext: buildTeamsContext } = useTeamsContext();
  const { buildContext: buildImapContext }  = useImapContext();

  const [state, setState] = useState<UseFunctionState>({
    result: null,
    loading: false,
    error: null,
    activeFn: null,
  });

  const run = useCallback(async (functionId: string) => {
    setState((s) => ({ ...s, loading: true, error: null, result: null }));

    // Fetch the function metadata from the registry (client-side import)
    const { getAIFunction } = await import("./registry");
    const fn = getAIFunction(functionId);
    if (!fn) {
      setState((s) => ({ ...s, loading: false, error: `Unknown function: ${functionId}` }));
      return;
    }

    setState((s) => ({ ...s, activeFn: fn }));

    // Gather connector context in parallel (best-effort)
    const [graphCtx, teamsCtx, imapCtx] = await Promise.all([
      buildGraphContext().catch(() => undefined),
      buildTeamsContext().catch(() => undefined),
      buildImapContext().catch(() => undefined),
    ]);

    const context =
      [graphCtx, teamsCtx, imapCtx]
        .filter((c): c is string => Boolean(c))
        .join("\n\n") || undefined;

    try {
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

      setState((s) => ({ ...s, loading: false, result: data.reply, error: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
        result: null,
      }));
    }
  }, [config, buildGraphContext, buildTeamsContext, buildImapContext]);

  const reset = useCallback(() => {
    setState({ result: null, loading: false, error: null, activeFn: null });
  }, []);

  return { ...state, run, reset };
}
