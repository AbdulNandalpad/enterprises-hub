"use client";

import { useState, useEffect } from "react";
import { useAI, type AIPanelPosition } from "@/contexts/AIContext";
import { AI_PROVIDERS, getProvider, type AIProviderId } from "@/lib/ai-providers";
import { useRoles } from "@/contexts/RolesContext";

const POSITION_OPTIONS: { value: AIPanelPosition; label: string; desc: string }[] = [
  { value: "right",    label: "Right panel", desc: "Docked to the right side" },
  { value: "floating", label: "Floating",    desc: "Draggable floating window" },
  { value: "bottom",   label: "Bottom bar",  desc: "Collapsed bar at the bottom" },
];

export function AISettings() {
  const { config, keyConfigured, update, markKeyConfigured } = useAI();
  const { isAdmin } = useRoles();

  // Personal key state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [removing, setRemoving] = useState(false);

  // Workspace key state (admin only)
  const [wsKeyInput,      setWsKeyInput]      = useState("");
  const [wsKeyConfigured, setWsKeyConfigured] = useState(false);
  const [wsSaving,        setWsSaving]        = useState(false);
  const [wsStatus,        setWsStatus]        = useState<"idle" | "saved" | "error">("idle");
  const [wsRemoving,      setWsRemoving]      = useState(false);

  const provider = getProvider(config.provider);

  // Reset key inputs when provider changes
  useEffect(() => {
    setApiKeyInput(""); setSaveStatus("idle");
    setWsKeyInput(""); setWsStatus("idle");
    // Check workspace key status for this provider
    fetch(`/api/admin/ai-config?provider=${encodeURIComponent(config.provider)}`)
      .then(r => r.json())
      .then((d: { configured?: boolean }) => setWsKeyConfigured(d.configured ?? false))
      .catch(() => {});
  }, [config.provider]);

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider, key: apiKeyInput.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to save key");
      }
      markKeyConfigured(true);
      setApiKeyInput("");
      setSaveStatus("saved");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWorkspaceKey() {
    if (!wsKeyInput.trim()) return;
    setWsSaving(true); setWsStatus("idle");
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider, key: wsKeyInput.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setWsKeyConfigured(true);
      setWsKeyInput("");
      setWsStatus("saved");
      markKeyConfigured(true); // immediately reflects in the panel
    } catch { setWsStatus("error"); }
    finally { setWsSaving(false); }
  }

  async function handleRemoveWorkspaceKey() {
    setWsRemoving(true);
    try {
      await fetch("/api/admin/ai-config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider }),
      });
      setWsKeyConfigured(false);
    } finally { setWsRemoving(false); }
  }

  async function handleRemoveKey() {
    setRemoving(true);
    try {
      await fetch("/api/user/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider }),
      });
      markKeyConfigured(false);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* Enable / disable */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Assistant</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Enable or disable the AI panel across the workspace.</p>
          </div>
          <div
            onClick={() => update({ enabled: !config.enabled })}
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${
              config.enabled ? "bg-[var(--active-text)]" : "bg-[var(--shell-border)]"
            }`}
            role="switch"
            aria-checked={config.enabled}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              config.enabled ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </div>
        </div>
      </section>

      {config.enabled && (
        <>
          {/* Provider selection */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Provider</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Choose which LLM powers the AI assistant.</p>
            <div className="grid grid-cols-1 gap-2">
              {AI_PROVIDERS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    config.provider === p.id
                      ? "border-[var(--active-text)] bg-[var(--active-bg)]"
                      : "border-[var(--shell-border)] bg-[var(--shell-surface)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.id}
                    checked={config.provider === p.id}
                    onChange={() => update({ provider: p.id as AIProviderId, model: p.models[0].id })}
                    className="mt-0.5 accent-[var(--active-text)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{p.label}</span>
                      {config.provider === p.id && keyConfigured && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--green-bg)] text-[var(--green-status)] border border-[var(--green-border)]">
                          Key saved
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Model selection */}
          {provider && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Model</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">Select the model within {provider.label}.</p>
              <div className="flex flex-col gap-2">
                {provider.models.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      config.model === m.id
                        ? "border-[var(--active-text)] bg-[var(--active-bg)]"
                        : "border-[var(--shell-border)] bg-[var(--shell-surface)] hover:bg-[var(--hover-bg)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={config.model === m.id}
                      onChange={() => update({ model: m.id })}
                      className="mt-0.5 accent-[var(--active-text)]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{m.label}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {m.contextWindow > 0 ? `${(m.contextWindow / 1000).toFixed(0)}k ctx` : "custom ctx"}
                        </span>
                        {m.supportsTools && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--blue-bg)] text-[var(--blue-status)] border border-[var(--blue-border)]">
                            tools
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* API key + workspace key */}
          {provider && (
            <>
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">API Key</h3>
              <p className="text-xs text-[var(--text-muted)] mb-1">{provider.keyHelpText}</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-4 font-mono">
                Keys are stored in a secure httpOnly cookie — never in your browser storage.
              </p>

              {keyConfigured ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--green-border)] bg-[var(--green-bg)]">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  <span className="text-sm text-[var(--green-status)]">API key is saved and active</span>
                  <button
                    onClick={handleRemoveKey}
                    disabled={removing}
                    className="ml-auto text-[11px] font-mono text-[var(--red-status)] hover:underline disabled:opacity-50"
                  >
                    {removing ? "Removing…" : "Remove"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    autoComplete="off"
                    className="flex-1 px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)] font-mono"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={saving || !apiKeyInput.trim()}
                    className="px-4 py-2 text-sm font-medium bg-[var(--navy)] text-white rounded-lg hover:bg-[var(--navy-hover)] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}

              {saveStatus === "saved" && (
                <p className="text-[11px] text-[var(--green-status)] mt-2">Key saved successfully.</p>
              )}
              {saveStatus === "error" && (
                <p className="text-[11px] text-[var(--red-status)] mt-2">Failed to save key. Check the format and try again.</p>
              )}
            </section>

            {/* Workspace key — admin only */}
            {provider && isAdmin && (
              <section>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Workspace Key</h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] text-[var(--admin)] border border-[var(--admin-border)]">Admin</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Set a shared API key for the entire workspace. All team members can use the AI assistant
                  from any device without entering their own key.
                </p>

                {wsKeyConfigured ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)]">
                    <span className="text-[var(--admin)]">✓</span>
                    <span className="text-sm text-[var(--admin)]">Workspace key is active — all users can access AI</span>
                    <button
                      onClick={handleRemoveWorkspaceKey}
                      disabled={wsRemoving}
                      className="ml-auto text-[11px] font-mono text-[var(--red-status)] hover:underline disabled:opacity-50"
                    >
                      {wsRemoving ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={wsKeyInput}
                      onChange={(e) => setWsKeyInput(e.target.value)}
                      placeholder={provider.keyPlaceholder}
                      autoComplete="off"
                      className="flex-1 px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--admin)] font-mono"
                    />
                    <button
                      onClick={handleSaveWorkspaceKey}
                      disabled={wsSaving || !wsKeyInput.trim()}
                      className="px-4 py-2 text-sm font-medium bg-[var(--admin)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {wsSaving ? "Saving…" : "Save for All"}
                    </button>
                  </div>
                )}

                {wsStatus === "saved" && (
                  <p className="text-[11px] text-[var(--admin)] mt-2">Workspace key saved — all users now have AI access.</p>
                )}
                {wsStatus === "error" && (
                  <p className="text-[11px] text-[var(--red-status)] mt-2">Failed to save. Check the key format and try again.</p>
                )}

                {!wsKeyConfigured && !keyConfigured && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    Non-admin users will see "No key configured" until you save a workspace key
                    or they add their own personal key above.
                  </p>
                )}
              </section>
            )}

            {/* Non-admin: show workspace key status if one exists */}
            {!isAdmin && wsKeyConfigured && !keyConfigured && (
              <section>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)]">
                  <span className="text-[var(--admin)]">✓</span>
                  <span className="text-sm text-[var(--admin)]">Your admin has configured a workspace key — AI is ready</span>
                </div>
              </section>
            )}
            </>
          )}

          {/* Azure-specific fields */}
          {config.provider === "azure-openai" && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Azure OpenAI Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    value={config.azureEndpoint}
                    onChange={(e) => update({ azureEndpoint: e.target.value })}
                    placeholder="https://your-resource.openai.azure.com"
                    className="w-full px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Deployment Name</label>
                  <input
                    type="text"
                    value={config.azureDeployment}
                    onChange={(e) => update({ azureDeployment: e.target.value })}
                    placeholder="gpt-4o-deployment"
                    className="w-full px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)] font-mono"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Custom endpoint */}
          {config.provider === "custom" && (
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Custom Endpoint</h3>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Base URL (OpenAI-compatible)</label>
              <input
                type="url"
                value={config.customBaseUrl}
                onChange={(e) => update({ customBaseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="w-full px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)] font-mono"
              />
            </section>
          )}

          {/* Panel customisation */}
          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Panel Settings</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Customise how the AI panel appears in your workspace.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Panel label</label>
                <input
                  type="text"
                  value={config.panelLabel}
                  onChange={(e) => update({ panelLabel: e.target.value.slice(0, 40) })}
                  placeholder="AI Assistant"
                  maxLength={40}
                  className="w-full px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)]"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Rename the AI panel to anything — "Copilot", "ARIA", "Assistant"…</p>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">Position</label>
                <div className="flex gap-2">
                  {POSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update({ panelPosition: opt.value })}
                      className={`flex-1 p-2.5 rounded-lg border text-center transition-all ${
                        config.panelPosition === opt.value
                          ? "border-[var(--active-text)] bg-[var(--active-bg)] text-[var(--active-text)]"
                          : "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                      }`}
                    >
                      <div className="text-xs font-medium">{opt.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Additional instructions</label>
                <textarea
                  value={config.systemPromptAddition}
                  onChange={(e) => update({ systemPromptAddition: e.target.value.slice(0, 1000) })}
                  placeholder="Always respond in German. Focus on SAP-related questions."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-[var(--active-text)] resize-none font-mono"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  {config.systemPromptAddition.length}/1000 — Appended to the base system prompt.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
