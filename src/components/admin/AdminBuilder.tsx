"use client";
import { useState } from "react";
import { TabBar, SectionCard, RowItem, Badge, Btn, Insight } from "./AdminUI";

const yaml = `connector:
  id: "proalpha-erp"
  name: "proALPHA ERP"
  category: "ERP"
  version: "1.0.0"
  vendor: "proALPHA Consulting AG"

auth:
  method: "oauth2"
  tokenUrl: "https://{tenant}.proalpha.de/oauth/token"
  scopes: ["erp.read", "erp.write"]
  pkce: true

embed:
  mode: "iframe"
  url: "https://{tenant}.proalpha.de/webapp"

api:
  baseUrl: "https://{tenant}.proalpha.de/api/v2"
  endpoints:
    - id: "getOrders"
      path: "/production/orders"
      method: GET

copilot:
  contextLabel: "proALPHA ERP"
  suggestedPrompts:
    - "Show open production orders"
    - "Check material availability"

roles:
  visibility: ["production", "procurement"]`;

const tsCode = `import { ConnectorSDK } from '@enterprisehub/sdk';

// Only needed for SOAP auth — standard systems use YAML only
const connector = new ConnectorSDK({ id: 'legacy-soap-erp' });

connector.onAuthExchange(async (token) => {
  // Custom SOAP handshake
  const soapToken = await legacySoapLogin(token);
  return { Authorization: \`SOAP \${soapToken}\` };
});

connector.onDataTransform('getOrders', (raw) => {
  // Convert XML → JSON for Copilot
  return parseXmlToJson(raw);
});

export default connector;`;

export default function AdminBuilder() {
  const [tab, setTab] = useState("YAML Builder");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Connector Builder SDK</h1>
        <p className="text-sm text-[var(--text-secondary)]">Define connectors in YAML or TypeScript — no-code for standard REST/OAuth systems.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["YAML Builder","Code Editor","Test & Validate"]} active={tab} onChange={setTab} admin />

      {tab === "YAML Builder" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">SDK Guide:</strong> Define your connector in YAML — no code needed for standard REST/OAuth systems. AI can generate the full YAML from an OpenAPI spec.</>}
          />
          <SectionCard
            title="Connector Definition — YAML"
            action={<div className="flex gap-2"><Btn>✦ AI Generate</Btn><Btn>Validate</Btn></div>}
          >
            <div className="p-4">
              <pre className="font-mono text-xs bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded p-4 overflow-x-auto leading-relaxed text-[var(--text-secondary)] whitespace-pre">
                {yaml}
              </pre>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "Code Editor" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">TypeScript SDK:</strong> Only needed for non-standard auth flows, SOAP APIs, or custom data transforms. Override only the methods that deviate from standard.</>}
          />
          <SectionCard
            title="TypeScript Override — Advanced"
            action={<div className="flex gap-2"><Btn>✦ Scaffold</Btn><Btn>Format</Btn></div>}
          >
            <div className="p-4">
              <pre className="font-mono text-xs bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded p-4 overflow-x-auto leading-relaxed text-[var(--text-secondary)] whitespace-pre">
                {tsCode}
              </pre>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "Test & Validate" && (
        <div className="flex flex-col gap-4">
          <SectionCard title="Connector Validation Results">
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="YAML schema — valid"                    sub="All required fields present"                         right={<Badge variant="green">Pass</Badge>} />
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="Auth endpoint reachable"                sub="OAuth token exchange successful"                     right={<Badge variant="green">Pass</Badge>} />
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="API endpoint test — getOrders"          sub="200 OK · 142ms response"                             right={<Badge variant="green">Pass</Badge>} />
            <RowItem icon="⚠️" iconBg="var(--amber-bg)" title="iFrame embedding"                       sub="X-Frame-Options detected — proxy mode recommended"   right={<Badge variant="amber">Warning</Badge>} />
            <RowItem icon="✅" iconBg="var(--green-bg)"  title="Security scan — no credential leakage"  sub="Passed static analysis"                              right={<Badge variant="green">Pass</Badge>} />
          </SectionCard>
          <div className="flex gap-2">
            <Btn variant="admin">Publish to Marketplace</Btn>
            <Btn>Save as Private</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
