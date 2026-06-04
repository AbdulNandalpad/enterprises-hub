"use client";

/**
 * useSalesforceContext — provides a `buildContext()` function for AI injection.
 *
 * For each active + connected Salesforce org:
 *   1. Load configs from /api/admin/connectors?type=salesforce
 *   2. Check connection status via cookie (httpOnly, server-side)
 *   3. Fetch stats + top opportunities for connected orgs
 *   4. Return a formatted plain-text block the AI can reason over
 *
 * Never exposes tokens or credentials to the client.
 *
 * AI Data Access scoping:
 *   The user's MSAL email is sent as X-User-Email so the server can apply
 *   the admin-configured data_scope (all / team / own / none) per role.
 */

import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";

interface ConnectorConfig {
  id: string;
  label: string;
  instance_url: string;
  is_active: boolean;
}

interface SFStats {
  totalOpportunities: number;
  openOpportunities: number;
  totalPipeline: number;
  closedWonThisMonth: number;
}

interface SFOpportunity {
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  AccountName: string | null;
  Probability: number | null;
}

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function useSalesforceContext() {
  const { instance, accounts } = useMsal();

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    try {
      // Acquire ID token for server-side identity verification
      let idToken: string | null = null;
      const account = accounts[0];
      if (account) {
        try {
          const result = await instance.acquireTokenSilent({
            scopes:  ["openid", "profile"],
            account,
          });
          idToken = result.idToken ?? null;
        } catch {
          idToken = (account.idTokenClaims as Record<string, unknown>)?.__raw as string ?? null;
        }
      }

      const authHeaders: Record<string, string> = idToken
        ? { "Authorization": `Bearer ${idToken}` }
        : {};

      // 1. Load active Salesforce configs
      const cfgRes = await fetch("/api/admin/connectors?type=salesforce");
      if (!cfgRes.ok) return undefined;
      const configs = (await cfgRes.json()) as ConnectorConfig[];
      if (!Array.isArray(configs) || configs.length === 0) return undefined;

      const activeConfigs = configs.filter((c) => c.is_active);
      if (activeConfigs.length === 0) return undefined;

      const sections: string[] = [];

      // 2. For each config, check connection and fetch data
      for (const cfg of activeConfigs) {
        try {
          const statusRes = await fetch(`/api/connectors/salesforce/status?configId=${cfg.id}`, {
            headers: authHeaders, // verified identity for cross-device token lookup
          });
          if (!statusRes.ok) continue;
          const { connected } = (await statusRes.json()) as { connected: boolean };
          if (!connected) continue;

          // Fetch stats + opportunities in parallel, passing verified identity for scoping
          const [statsRes, oppsRes] = await Promise.all([
            fetch(`/api/connectors/salesforce/data?configId=${cfg.id}&type=stats`, {
              headers: authHeaders,
            }),
            fetch(`/api/connectors/salesforce/data?configId=${cfg.id}&type=opportunities`, {
              headers: authHeaders,
            }),
          ]);

          // 403 = AI access blocked for this connector/role — skip silently
          if (statsRes.status === 403) continue;

          const stats = statsRes.ok ? (await statsRes.json()) as SFStats : null;
          const opps  = oppsRes.ok  ? (await oppsRes.json())  as SFOpportunity[] : [];

          const lines: string[] = [`[Salesforce — ${cfg.label}]`];

          if (stats) {
            lines.push(
              `Pipeline: ${fmtCurrency(stats.totalPipeline)} | ` +
              `Open deals: ${stats.openOpportunities} | ` +
              `Won this month: ${stats.closedWonThisMonth} | ` +
              `Total opportunities: ${stats.totalOpportunities}`
            );
          }

          if (Array.isArray(opps) && opps.length > 0) {
            lines.push("Recent opportunities:");
            for (const opp of opps.slice(0, 10)) {
              const close = new Date(opp.CloseDate).toLocaleDateString("en-DE", { day: "numeric", month: "short" });
              const prob  = opp.Probability != null ? ` (${opp.Probability}%)` : "";
              lines.push(
                `  • ${opp.Name}` +
                `${opp.AccountName ? ` — ${opp.AccountName}` : ""}` +
                ` — ${opp.StageName}${prob}` +
                ` — ${fmtCurrency(opp.Amount)}` +
                ` — closes ${close}`
              );
            }
          }

          sections.push(lines.join("\n"));
        } catch {
          // skip this org on error — don't block other orgs or the whole AI call
        }
      }

      return sections.length > 0 ? sections.join("\n\n") : undefined;
    } catch {
      return undefined;
    }
  }, [instance, accounts]);

  return { buildContext };
}
