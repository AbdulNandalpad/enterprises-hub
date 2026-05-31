"use client";

import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { useUIPrefs, type SidebarMode, type Density } from "@/contexts/UIPrefsContext";
import { IconSun, IconMoon, IconMonitor, type IconComponent } from "@/components/icons";

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: IconComponent; desc: string }[] = [
  { value: "light",  label: "Light",  Icon: IconSun,     desc: "Always use light mode" },
  { value: "dark",   label: "Dark",   Icon: IconMoon,    desc: "Always use dark mode" },
  { value: "system", label: "System", Icon: IconMonitor, desc: "Follow OS preference" },
];

const SIDEBAR_OPTIONS: { value: SidebarMode; label: string; desc: string }[] = [
  { value: "expanded",  label: "Expanded",   desc: "Full labels visible" },
  { value: "icons",     label: "Icons only", desc: "Compact — icons without labels" },
  { value: "collapsed", label: "Collapsed",  desc: "Hidden — toggle to open" },
];

const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: "compact",     label: "Compact",     desc: "Tighter spacing, more content" },
  { value: "normal",      label: "Normal",      desc: "Default spacing" },
  { value: "comfortable", label: "Comfortable", desc: "More breathing room" },
];

export function AppearanceSettings() {
  const { mode, setMode } = useTheme();
  const { prefs, update } = useUIPrefs();

  return (
    <div className="space-y-8">

      {/* Theme */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Theme</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Choose how the interface looks.</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-all ${
                mode === opt.value
                  ? "border-[var(--active-text)] bg-[var(--active-bg)] text-[var(--active-text)]"
                  : "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--text-secondary)] hover:border-[var(--active-border)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <opt.Icon size={20} />
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Sidebar mode */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sidebar</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Control how the navigation sidebar appears.</p>
        <div className="flex flex-col gap-2">
          {SIDEBAR_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                prefs.sidebarMode === opt.value
                  ? "border-[var(--active-text)] bg-[var(--active-bg)]"
                  : "border-[var(--shell-border)] bg-[var(--shell-surface)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <input
                type="radio"
                name="sidebarMode"
                value={opt.value}
                checked={prefs.sidebarMode === opt.value}
                onChange={() => update({ sidebarMode: opt.value })}
                className="accent-[var(--active-text)]"
              />
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Density */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Density</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Adjust how compact the UI feels.</p>
        <div className="flex gap-3">
          {DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ density: opt.value })}
              className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                prefs.density === opt.value
                  ? "border-[var(--active-text)] bg-[var(--active-bg)] text-[var(--active-text)]"
                  : "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
              }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
