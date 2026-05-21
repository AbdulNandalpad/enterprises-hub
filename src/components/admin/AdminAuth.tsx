"use client";
import { useState } from "react";
import { TabBar, SectionCard, RowItem, Badge, Btn, Insight, Toggle, FieldGroup, selectCls } from "./AdminUI";

export default function AdminAuth() {
  const [tab, setTab] = useState("Identity Providers");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Auth & SSO Config</h1>
        <p className="text-sm text-[var(--text-secondary)]">Identity providers, token lifetimes and downstream auth mapping.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Identity Providers","Token Settings"]} active={tab} onChange={setTab} admin />

      {tab === "Identity Providers" && (
        <div className="flex flex-col gap-4">
          <SectionCard title="Configured Identity Providers" action={<Btn>+ Add IdP</Btn>}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--shell-border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--active-bg)] flex items-center justify-center text-sm flex-shrink-0">🔐</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Azure AD / Entra ID</div>
                <div className="text-xs text-[var(--text-muted)]">Primary IdP · Tenant: trelleborg.onmicrosoft.com · OIDC + SAML</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="green">Active</Badge>
                <Toggle checked={true} />
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--shell-bg)] flex items-center justify-center text-sm flex-shrink-0">🔐</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Okta (Fallback)</div>
                <div className="text-xs text-[var(--text-muted)]">Secondary IdP · SAML 2.0 · For non-Azure tenants</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="gray">Standby</Badge>
                <Toggle checked={false} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Downstream System Auth Mapping">
            <RowItem icon="📋" iconBg="var(--active-bg)"  title="SAP S/4HANA"           sub="SAML 2.0 federation → Azure AD as IdP"          right={<Badge variant="green">Configured</Badge>} />
            <RowItem icon="📋" iconBg="var(--active-bg)"  title="Sales & Service Cloud" sub="OAuth 2.0 · Token exchange via auth broker"       right={<Badge variant="green">Configured</Badge>} />
            <RowItem icon="📋" iconBg="var(--active-bg)"  title="Marketo"               sub="OAuth 2.0 · API-only · No iFrame auth needed"     right={<Badge variant="green">Configured</Badge>} />
            <RowItem icon="📋" iconBg="var(--amber-bg)"   title="OTRS"                  sub="Basic Auth + Azure Proxy · Credential vault"      right={<Badge variant="amber">Partial</Badge>} />
          </SectionCard>
        </div>
      )}

      {tab === "Token Settings" && (
        <SectionCard title="Token Lifetime Configuration">
          <div className="p-4 grid grid-cols-2 gap-4">
            <FieldGroup label="Access Token Lifetime">
              <select className={selectCls}><option>1 hour</option><option>2 hours</option><option>8 hours</option></select>
            </FieldGroup>
            <FieldGroup label="Refresh Token Lifetime">
              <select className={selectCls}><option>7 days</option><option>14 days</option><option>30 days</option></select>
            </FieldGroup>
            <FieldGroup label="Session Idle Timeout">
              <select className={selectCls}><option>30 minutes</option><option>1 hour</option><option>4 hours</option></select>
            </FieldGroup>
            <FieldGroup label="MFA Policy">
              <select className={selectCls}><option>Required for all</option><option>Required for Admin only</option><option>Optional</option></select>
            </FieldGroup>
          </div>
          <div className="px-4 pb-4">
            <Btn variant="admin">Save Settings</Btn>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
