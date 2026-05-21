"use client";
import { useState } from "react";
import { TabBar, SectionCard, RowItem, Badge, Btn, Insight } from "./AdminUI";

const steps = [
  {
    n: 1,
    title: "Install the SDK",
    desc: "Run npm install @enterprisehub/sdk — or use the no-code YAML builder in the Connector Builder panel.",
    code: "npm install @enterprisehub/sdk",
  },
  {
    n: 2,
    title: "Define your connector in YAML",
    desc: "Specify system name, auth method, API endpoints, embed URL, and Copilot prompts. Paste your OpenAPI spec and AI auto-generates 80% of the file.",
  },
  {
    n: 3,
    title: "Add TypeScript overrides (if needed)",
    desc: "Only for SOAP auth, XML transforms, or custom pagination. Override only the methods you need — everything else uses your YAML config.",
  },
  {
    n: 4,
    title: "Validate & publish",
    desc: "Run the built-in validator — it checks schema, auth, API reachability, and security. Publish as private or submit to the Marketplace.",
  },
];

const apiMethods = [
  { method: "ConnectorSDK(config)",    desc: "Initialise a connector with base YAML config",                         type: "Constructor" },
  { method: "onAuthExchange(fn)",      desc: "Override token exchange for non-standard auth flows",                  type: "Auth"        },
  { method: "onDataTransform(id, fn)", desc: "Transform raw API response before Copilot receives it",               type: "Data"        },
  { method: "onEmbed(fn)",             desc: "Customise iFrame injection or proxy routing",                          type: "Embed"       },
  { method: "validate()",             desc: "Run security and schema checks before publishing",                      type: "Dev"         },
  { method: "publish(options)",        desc: "Submit to Marketplace or save as private connector",                   type: "Deploy"      },
];

const examples = [
  { icon: "📄", bg: "var(--green-bg)",  title: "Standard REST + OAuth 2.0 (Salesforce)",   sub: "YAML only — no TypeScript needed" },
  { icon: "📄", bg: "var(--active-bg)", title: "SAML Federated (SAP S/4HANA)",             sub: "YAML + SAML assertion config" },
  { icon: "📄", bg: "var(--amber-bg)",  title: "Legacy SOAP + TypeScript Override",         sub: "Auth override + XML transform example" },
  { icon: "📄", bg: "var(--purple-bg)", title: "iFrame-blocked system via Proxy",           sub: "Reverse proxy embed pattern" },
];

export default function AdminSDK() {
  const [tab, setTab] = useState("Quick Start");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">SDK & API Docs</h1>
        <p className="text-sm text-[var(--text-secondary)]">Build connectors with the EnterpriseHub SDK — config-first, TypeScript optional.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Quick Start","API Reference","Examples"]} active={tab} onChange={setTab} admin />

      {tab === "Quick Start" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">SDK Overview:</strong> EnterpriseHub connectors are config-first — 80% of systems need only a YAML definition. TypeScript overrides are available for non-standard auth and data transforms. No backend infrastructure needed.</>}
          />
          <SectionCard title="Build a Connector in 4 Steps">
            <div className="p-1">
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  className={`flex items-start gap-3 px-4 py-3 ${i < steps.length - 1 ? "border-b border-[var(--shell-border)]" : ""}`}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--admin)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{s.desc}</div>
                    {s.code && (
                      <code className="inline-block mt-1.5 font-mono text-xs bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded px-2 py-0.5 text-[var(--text-secondary)]">
                        {s.code}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="flex gap-2">
            <Btn variant="admin">Open Connector Builder ↗</Btn>
            <Btn>Download SDK Docs PDF</Btn>
          </div>
        </div>
      )}

      {tab === "API Reference" && (
        <SectionCard title="SDK Methods Reference">
          {apiMethods.map((m) => (
            <div
              key={m.method}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <code className="text-xs text-[var(--admin)] font-mono">{m.method}</code>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{m.desc}</div>
              </div>
              <Badge variant="gray">{m.type}</Badge>
            </div>
          ))}
        </SectionCard>
      )}

      {tab === "Examples" && (
        <SectionCard title="Example Connectors">
          {examples.map((e) => (
            <RowItem
              key={e.title}
              icon={e.icon}
              iconBg={e.bg}
              title={e.title}
              sub={e.sub}
              right={<Btn>View</Btn>}
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}
