"use client";

/**
 * useSAPContext — provides a `buildContext()` function for AI injection.
 *
 * For each active SAP connector (Sales Cloud / S4HANA):
 *   1. Load configs from /api/admin/connectors?type=sap
 *   2. Fetch stats + recent opportunities via /api/connectors/sap/data
 *   3. Return a formatted plain-text block the AI can reason over
 *
 * SAP uses Basic auth (no OAuth cookie) — credentials stay server-side.
 */

import { useCallback } from "react";

interface ConnectorConfig {
  id: string;
  label: string;
  connector_type: string;
  is_active: boolean;
}

interface SAPStats {
  totalOpportunities: number;
  openOpportunities: number;
  totalPipeline: number;
  closedWon: number;
  closedLost: number;
}

interface SAPOpportunity {
  ID: string;
  Name: string;
  AccountName: string | null;
  SalesPhaseCode: string;
  ExpectedValue: number | null;
  CloseDate: string | null;
}

function fmtCurrency(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n.toFixed(0)}`;
}

function fmtDate(raw: string | null): string {
  if (!raw) return "—";
  const ms = raw.match(/\/Date\((\d+)\)\//)?.[1];
  if (ms) return new Date(Number(ms)).toLocaleDateString("en-DE", { day: "numeric", month: "short" });
  return raw.slice(0, 10);
}

export function useSAPContext() {
  const buildContext = useCallback(async (): Promise<string | undefined> => {
    try {
      // Load all SAP configs
      const cfgRes = await fetch("/api/admin/connectors");
      if (!cfgRes.ok) return undefined;
      const allConfigs = (await cfgRes.json()) as ConnectorConfig[];
      if (!Array.isArray(allConfigs)) return undefined;

      const sapConfigs = allConfigs.filter(
        (c) => c.is_active && c.connector_type.startsWith("sap")
      );
      if (sapConfigs.length === 0) return undefined;

      const sections: string[] = [];

      for (const cfg of sapConfigs) {
        try {
          const [statsRes, oppsRes] = await Promise.all([
            fetch(`/api/connectors/sap/data?configId=${cfg.id}&type=stats`),
            fetch(`/api/connectors/sap/data?configId=${cfg.id}&type=opportunities`),
          ]);

          if (!statsRes.ok) continue;

          const stats = (await statsRes.json()) as SAPStats;
          const opps  = oppsRes.ok ? (await oppsRes.json()) as SAPOpportunity[] : [];

          const typeName = cfg.connector_type === "sap_s4hana" ? "SAP S/4HANA" : "SAP Sales Cloud";
          const lines: string[] = [`[${typeName} — ${cfg.label}]`];

          lines.push(
            `Pipeline: ${fmtCurrency(stats.totalPipeline)} | ` +
            `Open: ${stats.openOpportunities} | ` +
            `Won: ${stats.closedWon} | ` +
            `Lost: ${stats.closedLost} | ` +
            `Total: ${stats.totalOpportunities}`
          );

          if (Array.isArray(opps) && opps.length > 0) {
            lines.push("Recent opportunities:");
            for (const opp of opps.slice(0, 10)) {
              lines.push(
                `  • ${opp.Name}` +
                `${opp.AccountName ? ` — ${opp.AccountName}` : ""}` +
                ` — Phase ${opp.SalesPhaseCode}` +
                ` — ${fmtCurrency(opp.ExpectedValue)}` +
                ` — closes ${fmtDate(opp.CloseDate)}`
              );
            }
          }

          sections.push(lines.join("\n"));
        } catch {
          // skip this system on error
        }
      }

      return sections.length > 0 ? sections.join("\n\n") : undefined;
    } catch {
      return undefined;
    }
  }, []);

  return { buildContext };
}
