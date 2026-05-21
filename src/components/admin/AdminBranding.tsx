"use client";
import { useState } from "react";
import { TabBar, SectionCard, Btn, Insight, FieldGroup, inputCls } from "./AdminUI";

export default function AdminBranding() {
  const [tab, setTab] = useState("Theme Config");

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Branding & White-label</h1>
        <p className="text-sm text-[var(--text-secondary)]">Customise the shell appearance per tenant.</p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />
      <TabBar tabs={["Theme Config","Preview"]} active={tab} onChange={setTab} admin />

      {tab === "Theme Config" && (
        <SectionCard title="White-label Configuration — Trelleborg Sealing Solutions">
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Company Name">
                <input className={inputCls} defaultValue="Trelleborg Sealing Solutions" />
              </FieldGroup>
              <FieldGroup label="Shell Title">
                <input className={inputCls} defaultValue="TSS Hub" />
              </FieldGroup>
              <FieldGroup label="Primary Brand Colour">
                <input className={inputCls} type="color" defaultValue="#1A3AC8" style={{ height: 32, padding: "2px 6px", cursor: "pointer" }} />
              </FieldGroup>
              <FieldGroup label="Logo URL">
                <input className={inputCls} defaultValue="https://cdn.tss.com/logo.svg" />
              </FieldGroup>
              <FieldGroup label="Favicon">
                <input className={inputCls} placeholder="https://…" />
              </FieldGroup>
              <FieldGroup label="Custom Domain">
                <input className={inputCls} defaultValue="hub.tss.com" />
              </FieldGroup>
            </div>
            <FieldGroup label="Tagline">
              <input className={inputCls} defaultValue="Unified Enterprise Workspace — Trelleborg" />
            </FieldGroup>
            <div className="flex gap-2">
              <Btn variant="admin">Save Branding</Btn>
              <Btn>Reset to Default</Btn>
            </div>
          </div>
        </SectionCard>
      )}

      {tab === "Preview" && (
        <div className="flex flex-col gap-4">
          <Insight
            admin
            text={<><strong className="text-[var(--admin)]">Live Preview:</strong> This is how the shell appears to TSS users at hub.tss.com. Brand colours, logo, and tagline are applied from the theme config.</>}
          />
          {/* Mini shell preview */}
          <div className="bg-[var(--shell-border)] rounded-lg overflow-hidden border border-[var(--shell-border)]">
            {/* Preview topbar */}
            <div className="flex items-center gap-2 px-3 h-9 bg-[var(--navy)]">
              <div className="w-3 h-3 rounded bg-white/25" />
              <span className="text-white text-xs font-bold">TSS Hub</span>
              <span className="ml-auto text-white/60 text-[10px]">Abdul Rashid ▼</span>
            </div>
            {/* Preview body */}
            <div className="flex gap-2 p-2 bg-[var(--shell-bg)]">
              {/* Preview sidebar */}
              <div className="w-16 bg-white rounded p-1.5 text-[8px] text-[var(--text-muted)]">
                <div className="text-[7px] text-gray-400 mb-1">ERP</div>
                <div className="bg-[var(--active-bg)] text-[var(--active-text)] rounded px-1 py-0.5 mb-1">S/4HANA</div>
                <div className="text-[7px] text-gray-400 mt-1.5 mb-1">CRM</div>
                <div className="px-1 py-0.5 mb-1 text-gray-500">Sales Cloud</div>
                <div className="px-1 py-0.5 mb-1 text-gray-500">Marketo</div>
              </div>
              {/* Preview main */}
              <div className="flex-1 bg-white rounded p-2">
                <div className="text-[9px] font-semibold text-[var(--text-primary)] mb-2">Dashboard — SAP S/4HANA</div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <div className="bg-[var(--active-bg)] rounded p-1.5 border-t-2 border-[var(--active-text)]">
                    <div className="text-[7px] text-gray-400">Revenue MTD</div>
                    <div className="text-[10px] font-bold text-[var(--text-primary)]">€4.2M</div>
                  </div>
                  <div className="bg-[var(--green-bg)] rounded p-1.5 border-t-2 border-[var(--green-status)]">
                    <div className="text-[7px] text-gray-400">Open POs</div>
                    <div className="text-[10px] font-bold text-[var(--text-primary)]">134</div>
                  </div>
                </div>
                <div className="bg-[var(--shell-bg)] rounded px-2 py-1.5 text-[7px] text-[var(--text-secondary)] border-l-2 border-[var(--active-text)]">
                  ✦ AI Insight: 58% AR risk from Bosch + Siemens
                </div>
              </div>
              {/* Preview copilot */}
              <div className="w-16 bg-white rounded p-1.5 text-[8px] text-[var(--text-muted)]">
                <div className="text-[7px] font-bold text-[var(--text-primary)] mb-1.5">Copilot</div>
                <div className="bg-[var(--shell-bg)] rounded p-1 mb-1.5 text-[var(--text-secondary)]">You're in S/4HANA…</div>
                <div className="border border-[var(--shell-border)] rounded p-1 text-gray-400">Ask…</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
