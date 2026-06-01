"use client";

/**
 * AppsSettings — toggle which apps appear in the sidebar.
 *
 * Groups apps by category. Changes are instant and persisted to localStorage.
 */

import { useApps } from "@/contexts/AppsContext";
import AppIcon from "@/components/AppIcon";

export function AppsSettings() {
  const { allApps, isEnabled, toggle } = useApps();

  // Group by category
  const grouped = allApps.reduce<Record<string, typeof allApps>>(
    (acc, app) => {
      if (!acc[app.category]) acc[app.category] = [];
      acc[app.category].push(app);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Sidebar Apps
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Choose which apps appear in your sidebar. Toggle off anything you
          don't use — changes apply instantly.
        </p>
      </div>

      {Object.entries(grouped).map(([category, categoryApps]) => (
        <div key={category}>
          <p className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase mb-2">
            {category}
          </p>
          <div className="rounded-xl border border-[var(--shell-border)] overflow-hidden">
            {categoryApps.map((app, idx) => {
              const enabled = isEnabled(app.id);
              return (
                <div
                  key={app.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    idx < categoryApps.length - 1
                      ? "border-b border-[var(--shell-border)]"
                      : ""
                  } ${enabled ? "bg-[var(--shell-surface)]" : "bg-[var(--shell-bg)] opacity-60"}`}
                >
                  {/* App icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${app.color}18` }}
                  >
                    <AppIcon slug={app.logo} color={app.color} size={16} />
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {app.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {app.url.replace(/^https?:\/\//, "")}
                    </p>
                  </div>

                  {/* Toggle */}
                  <button
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggle(app.id)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      enabled
                        ? "bg-[var(--active-text)]"
                        : "bg-[var(--shell-border)]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                        enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-[var(--text-muted)]">
        Apps are saved to this browser. Admins can configure the available app
        list in the Admin → Connector Registry.
      </p>
    </div>
  );
}
