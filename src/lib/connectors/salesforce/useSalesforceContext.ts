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
 */

import { useCallback } from "react";

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
  const buildContext = useCallback(async (): Promise<string | undefined> => {
    try {
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
          const statusRes = await fetch(`/api/connectors/salesforce/status?configId=${cfg.id}`);
          if (!statusRes.ok) continue;
          const { connected } = (await statusRes.json()) as { connected: boolean };
          if (!connected) continue;

          // Fetch stats + opportunities in parallel
          const [statsRes, oppsRes] = await Promise.all([
            fetch(`/api/connectors/salesforce/data?configId=${cfg.id}&type=stats`),
            fetch(`/api/connectors/salesforce/data?configId=${cfg.id}&type=opportunities`),
          ]);

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
  }, []);

  return { buildContext };
}
