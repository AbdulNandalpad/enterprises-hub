"use client";

import { useState } from "react";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { AISettings } from "@/components/settings/AISettings";
import { LabelsSettings } from "@/components/settings/LabelsSettings";
import { IconSliders, IconSparkle, IconPencil, type IconComponent } from "@/components/icons";

type Tab = "appearance" | "ai" | "labels";

const TABS: { id: Tab; label: string; Icon: IconComponent; desc: string }[] = [
  { id: "appearance", label: "Appearance", Icon: IconSliders, desc: "Theme, sidebar & density" },
  { id: "ai",         label: "AI",         Icon: IconSparkle, desc: "Provider, model & panel" },
  { id: "labels",     label: "Labels",     Icon: IconPencil,  desc: "Rename interface labels" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("appearance");

  return (
    <div>
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Customise your workspace — changes are saved automatically.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-[var(--shell-surface)] border border-[var(--shell-border)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-center transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--shell-bg)] shadow-sm border border-[var(--shell-border)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <tab.Icon size={16} />
              <span className="text-xs font-semibold">{tab.label}</span>
              <span className="text-[10px] text-[var(--text-muted)] hidden sm:block">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-[var(--shell-surface)] rounded-xl border border-[var(--shell-border)] p-6">
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "ai"         && <AISettings />}
          {activeTab === "labels"     && <LabelsSettings />}
        </div>

      </div>
    </div>
  );
}
