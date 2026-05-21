"use client";
import { useState } from "react";
import { TabBar, SectionCard, Badge, Insight, Btn, Toggle, FieldGroup, inputCls, selectCls } from "./AdminUI";

const connectors = [
  { name: "SAP S/4HANA",           cat: "ERP",           auth: "SAML 2.0",    users: 148, type: "verified"    },
  { name: "Sales & Service Cloud",  cat: "CRM & CX",      auth: "OAuth 2.0",   users: 92,  type: "verified"    },
  { name: "Commerce Cloud",         cat: "CRM & CX",      auth: "OAuth 2.0",   users: 44,  type: "verified"    },
  { name: "Marketo",                cat: "Marketing",     auth: "OAuth 2.0",   users: 18,  type: "verified"    },
  { name: "Price Estimator",        cat: "Pricing",       auth: "OIDC",        users: 31,  type: "custom"      },
  { name: "Microsoft Teams",        cat: "Collaboration", auth: "Azure AD",    users: 148, type: "verified"    },
  { name: "Jira",                   cat: "ITSM",          auth: "OAuth 2.0",   users: 22,  type: "marketplace" },
  { name: "OTRS",                   cat: "ITSM",          auth: "Basic+Proxy", users: 11,  type: "custom"      },
];

const typeBadge = (type: string) => {
  if (type === "verified")    return <Badge variant="green">✓ Verified</Badge>;
  if (type === "marketplace") return <Badge variant="blue">Marketplace</Badge>;
  return                               <Badge variant="admin">Custom</Badge>;
};

export default function AdminConnectors() {
  const [tab, setTab] = useState("Active Connectors");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Connector Registry</h1>
        <p className="text-sm text-[var(--text-secondary)]">Manage, configure and toggle live connectors.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Active Connectors", "Add Connector"]} active={tab} onChange={setTab} admin />

      {tab === "Active Connectors" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">AI Insight:</strong> All 11 connectors are healthy. The Marketo connector was last authorised 28 days ago — consider re-verifying scopes before the 30-day expiry.</>}
          />
          <div className="flex flex-col gap-3">
            {connectors.map((c) => (
              <div
                key={c.name}
                className="bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-lg p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
                style={{
                  borderLeft: `3px solid ${
                    c.type === "verified" ? "var(--green-status)" :
                    c.type === "marketplace" ? "var(--amber-status)" :
                    "var(--admin)"
                  }`,
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--shell-bg)] flex items-center justify-center text-lg flex-shrink-0">
                  🔌
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{c.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{c.cat} · {c.auth} · {c.users} users</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {typeBadge(c.type)}
                    <Badge variant="green">Live</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Btn>Configure</Btn>
                  <Toggle />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Add Connector" && (
        <SectionCard title="Add New Connector">
          <div className="p-4 flex flex-col gap-4">
            <Insight
              admin
              text={<><strong className="text-[var(--admin)]">Tip:</strong> Paste your system's OpenAPI/Swagger URL below and AI will auto-generate the connector definition. Saves 80% of setup time.</>}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="System Name">
                <input className={inputCls} placeholder="e.g. proALPHA ERP" />
              </FieldGroup>
              <FieldGroup label="Category">
                <select className={selectCls}>
                  {["ERP","CRM & CX","Marketing","Pricing","Collaboration","ITSM","Custom"].map(o=><option key={o}>{o}</option>)}
                </select>
              </FieldGroup>
              <FieldGroup label="Base URL">
                <input className={inputCls} placeholder="https://your-system.com" />
              </FieldGroup>
              <FieldGroup label="Auth Method">
                <select className={selectCls}>
                  {["OAuth 2.0","SAML 2.0","OIDC","Basic + Proxy","API Key"].map(o=><option key={o}>{o}</option>)}
                </select>
              </FieldGroup>
            </div>
            <FieldGroup label="OpenAPI / Swagger URL (optional — AI auto-generates config)">
              <input className={inputCls} placeholder="https://your-system.com/api/openapi.json" />
            </FieldGroup>
            <FieldGroup label="Copilot System Prompt">
              <textarea
                className="w-full text-xs border border-[var(--shell-border)] rounded px-2.5 py-2 bg-[var(--shell-surface)] text-[var(--text-primary)] outline-none focus:border-[var(--active-text)] resize-none"
                rows={3}
                placeholder="Describe what this system does and what the Copilot should help users with…"
              />
            </FieldGroup>
            <div className="flex gap-2">
              <Btn variant="admin">✦ AI Generate Config</Btn>
              <Btn>Test Connection</Btn>
              <Btn>Save Connector</Btn>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
