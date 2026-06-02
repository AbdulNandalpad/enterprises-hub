"use client";

/**
 * useAllContexts — single hook that aggregates context from every configured connector.
 *
 * DESIGN PRINCIPLE: context is driven by what is configured & connected,
 * not by manual activation. If a connector is set up and authenticated,
 * its data is automatically available to the AI on every message.
 *
 * Two connector families:
 *
 *   Personal (per-user auth, always attempted):
 *     Microsoft Graph — calendar, profile        (Azure AD, always active)
 *     Microsoft Teams — team membership          (requires user consent)
 *     IMAP email      — inbox from IONOS/Gmail   (requires user credentials)
 *
 *   Org (admin-registered in connector_configs, checked per tenant):
 *     Salesforce      — pipeline + opportunities (requires OAuth per user)
 *     SAP             — pipeline + opportunities (requires Basic auth config)
 *
 * To add a new connector context in future:
 *   1. Create its `use<Name>Context` hook
 *   2. Add it to PERSONAL_BUILDERS or the ORG_BUILDERS map below
 *   — AIPanel.tsx needs no changes at all.
 *
 * Returns:
 *   buildContext() → combined context string (or undefined if nothing connected)
 *   connectedSources → display names of sources that returned data (for UI feedback)
 */

import { useCallback } from "react";
import { useGraphContext }       from "./graph/useGraphContext";
import { useTeamsContext }       from "./teams/useTeamsContext";
import { useImapContext }        from "./imap/useImapContext";
import { useSalesforceContext }  from "./salesforce/useSalesforceContext";
import { useSAPContext }         from "./sap/useSAPContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContextSource {
  name:    string;
  builder: () => Promise<string | undefined>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAllContexts() {
  // ── Personal connector hooks ──────────────────────────────────────────────
  const { buildContext: graphCtx }  = useGraphContext();
  const { buildContext: teamsCtx }  = useTeamsContext();
  const { buildContext: imapCtx }   = useImapContext();

  // ── Org connector hooks ───────────────────────────────────────────────────
  // Each checks its own connection state — silently returns undefined if
  // the user hasn't OAuth-connected or credentials aren't configured.
  const { buildContext: sfCtx }     = useSalesforceContext();
  const { buildContext: sapCtx }    = useSAPContext();

  // ── Source registry ───────────────────────────────────────────────────────
  // ADD NEW CONNECTORS HERE — nowhere else needs to change.
  const SOURCES: ContextSource[] = [
    { name: "Microsoft 365",  builder: graphCtx  },
    { name: "Teams",          builder: teamsCtx  },
    { name: "Email (IMAP)",   builder: imapCtx   },
    { name: "Salesforce",     builder: sfCtx     },
    { name: "SAP",            builder: sapCtx    },
  ];

  const buildContext = useCallback(async (): Promise<{
    context:          string | undefined;
    connectedSources: string[];
  }> => {
    // Run all builders in parallel — each is best-effort (never throws)
    const results = await Promise.all(
      SOURCES.map(async (src) => {
        try {
          const text = await src.builder();
          return { name: src.name, text };
        } catch {
          return { name: src.name, text: undefined };
        }
      })
    );

    const connected = results.filter((r) => Boolean(r.text));
    const context   = connected.length > 0
      ? connected.map((r) => r.text!).join("\n\n")
      : undefined;

    return {
      context,
      connectedSources: connected.map((r) => r.name),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphCtx, teamsCtx, imapCtx, sfCtx, sapCtx]);

  return { buildContext };
}
