"use client";

/**
 * ConnectorsSettings — configure Microsoft Teams and IMAP email connectors.
 *
 * Teams:  Full-page redirect consent (acquireTokenRedirect) — more reliable
 *         than popups across all browsers and enterprise setups.
 *         No credentials stored — the existing Azure AD session is reused.
 *
 * IMAP:   User enters host/port/email/password.
 *         Saved as a scoped httpOnly cookie via /api/connectors/imap/config.
 *         Password never returned to the client after saving.
 */

import { useState, useEffect, type FormEvent } from "react";
import { useMsal } from "@azure/msal-react";
import { TEAMS_SCOPES } from "@/lib/connectors/teams/scopes";
import {
  IMAP_PRESETS,
  IMAP_PROVIDER_LABELS,
  type ImapProvider,
  type ImapCredentials,
} from "@/lib/connectors/imap/types";
import { IconPlug, IconX } from "@/components/icons";

/** localStorage key that tracks whether the user wants Teams context active */
const TEAMS_ENABLED_KEY = "eh-teams-enabled";

// ─── Teams section ────────────────────────────────────────────────────────────

function TeamsSection() {
  const { instance, accounts } = useMsal();
  const [status, setStatus] = useState<"checking" | "idle" | "loading" | "connected" | "error">("checking");
  const [errorMsg, setErrorMsg] = useState("");

  // On mount: try silent token acquisition.
  // If it succeeds (scopes already consented), mark as connected automatically.
  // This also handles the post-redirect case — after acquireTokenRedirect brings
  // the user back, the token is in MSAL cache and silent acquisition works.
  useEffect(() => {
    const account = accounts[0];
    if (!account) { setStatus("idle"); return; }

    instance
      .acquireTokenSilent({ scopes: [...TEAMS_SCOPES], account })
      .then(() => {
        // Consent already granted — mark active regardless of localStorage flag
        localStorage.setItem(TEAMS_ENABLED_KEY, "true");
        setStatus("connected");
      })
      .catch(() => {
        // Not yet consented
        localStorage.removeItem(TEAMS_ENABLED_KEY);
        setStatus("idle");
      });
  }, [instance, accounts]);

  const handleGrant = async () => {
    const account = accounts[0];
    if (!account) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      // Full-page redirect consent — no popup, works in all browsers.
      // After consent, Microsoft redirects back to /login → /dashboard/settings
      // and the useEffect above will detect the token silently.
      await instance.acquireTokenRedirect({
        scopes: [...TEAMS_SCOPES],
        account,
        redirectStartPage: window.location.href, // return to this page after consent
      });
      // acquireTokenRedirect navigates away — code below never runs
    } catch (err) {
      setErrorMsg(`Could not start consent flow: ${(err as Error).message?.slice(0, 80) ?? "unknown error"}`);
      setStatus("error");
    }
  };

  // Disconnect — stops context injection immediately, no Azure portal needed.
  const handleDisconnect = () => {
    localStorage.removeItem(TEAMS_ENABLED_KEY);
    setStatus("idle");
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        Microsoft Teams
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Grant read-only access to your Teams membership and chat list. The AI
        assistant will know which teams you belong to and can reference group
        chats by name.
      </p>

      <div className="flex items-center gap-3 p-4 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <div className="flex-1">
          {status === "connected" ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Connected — Teams context active
              </span>
            </div>
          ) : status === "checking" ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-pulse inline-block" />
              <span className="text-sm text-[var(--text-muted)]">Checking…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] inline-block" />
              <span className="text-sm text-[var(--text-secondary)]">Not connected</span>
            </div>
          )}
          {errorMsg && (
            <p className="text-xs text-[var(--red-status)] mt-1">{errorMsg}</p>
          )}
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Scopes: Team.ReadBasic.All · Chat.ReadBasic · No admin approval needed
          </p>
        </div>

        {status === "connected" ? (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--shell-border)] text-xs text-[var(--text-secondary)] hover:text-[var(--red-status)] hover:border-[var(--red-border)] transition-colors"
            >
              <IconX size={11} />
              Disconnect
            </button>
            <a
              href="https://myaccount.microsoft.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
            >
              Revoke in Azure AD ↗
            </a>
          </div>
        ) : (
          <button
            onClick={handleGrant}
            disabled={status === "loading" || status === "checking"}
            className="px-3 py-1.5 rounded-lg bg-[var(--navy)] text-white text-xs font-medium hover:bg-[var(--navy-hover)] disabled:opacity-50 transition-colors"
          >
            {status === "loading" ? "Opening…" : "Grant Access"}
          </button>
        )}
      </div>
    </section>
  );
}

// ─── IMAP section ─────────────────────────────────────────────────────────────

interface ImapStatus {
  configured: boolean;
  user?: string;
  host?: string;
}

function ImapSection() {
  const [provider, setProvider] = useState<ImapProvider>("ionos");
  const [form, setForm] = useState<ImapCredentials>({
    host: IMAP_PRESETS.ionos.host,
    port: IMAP_PRESETS.ionos.port,
    user: "",
    pass: "",
    tls: true,
  });
  const [status, setStatus] = useState<ImapStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load current status on mount
  useEffect(() => {
    fetch("/api/connectors/imap/config")
      .then((r) => r.json())
      .then((d) => setStatus(d as ImapStatus))
      .catch(() => {});
  }, []);

  const handleProviderChange = (p: ImapProvider) => {
    setProvider(p);
    const preset = IMAP_PRESETS[p];
    setForm((prev) => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      tls:  preset.tls,
    }));
    setSaveOk(false);
    setSaveError("");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveOk(false);

    try {
      const res = await fetch("/api/connectors/imap/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveOk(true);
      setStatus({ configured: true, user: form.user, host: form.host });
      // Clear the password from local state after save
      setForm((prev) => ({ ...prev, pass: "" }));
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/connectors/imap/config", { method: "DELETE" });
      setStatus({ configured: false });
      setSaveOk(false);
      setTestResult(null);
    } catch { /* ignore */ }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/connectors/imap/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1 }),
      });
      const data = await res.json() as { messages?: unknown[]; error?: string };
      if (!res.ok) {
        setTestResult({ ok: false, msg: data.error ?? `Server error (${res.status})` });
      } else {
        const count = data.messages?.length ?? 0;
        setTestResult({ ok: true, msg: `Connection working — ${count} message${count !== 1 ? "s" : ""} found in inbox.` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        IMAP Email
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Connect any IMAP mailbox — IONOS, Gmail, or a custom server. The AI
        assistant will have context about your recent emails. Credentials are
        stored in a secure server-side cookie and never exposed to the browser.
      </p>

      {/* Current status */}
      {status?.configured && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <div>
              <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                {status.user}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-500 ml-2">
                via {status.host}
              </span>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--red-status)] transition-colors"
            title="Disconnect IMAP"
          >
            <IconX size={12} />
            Disconnect
          </button>
        </div>
      )}

      {/* Config form */}
      <form onSubmit={handleSave} className="space-y-4">

        {/* Provider selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Provider
          </label>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(IMAP_PROVIDER_LABELS) as ImapProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  provider === p
                    ? "border-[var(--active-text)] bg-[var(--active-bg)] text-[var(--active-text)]"
                    : "border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                }`}
              >
                {IMAP_PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Host + Port */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              IMAP Host
            </label>
            <input
              type="text"
              value={form.host}
              onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))}
              placeholder="imap.example.com"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--active-text)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Port
            </label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))}
              min={1}
              max={65535}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--active-text)] transition-colors"
            />
          </div>
        </div>

        {/* Gmail app-password note */}
        {provider === "gmail" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
            <IconPlug size={12} className="mt-0.5 flex-shrink-0" />
            <span>
              Gmail requires an <strong>App Password</strong> (not your Google account password).
              Enable 2FA, then go to{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                myaccount.google.com/apppasswords
              </a>
              .
            </span>
          </div>
        )}

        {/* Email + Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Email address
            </label>
            <input
              type="email"
              value={form.user}
              onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
              placeholder="you@example.com"
              required
              autoComplete="username"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--active-text)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Password{provider === "gmail" ? " (App Password)" : ""}
            </label>
            <input
              type="password"
              value={form.pass}
              onChange={(e) => setForm((p) => ({ ...p, pass: e.target.value }))}
              placeholder={status?.configured ? "Leave blank to keep existing" : "••••••••"}
              required={!status?.configured}
              autoComplete="current-password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--active-text)] transition-colors"
            />
          </div>
        </div>

        {/* TLS toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.tls}
            onChange={(e) => setForm((p) => ({ ...p, tls: e.target.checked }))}
            className="accent-[var(--active-text)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">Use TLS/SSL (recommended)</span>
        </label>

        {/* Feedback */}
        {saveError && (
          <p className="text-xs text-[var(--red-status)]">{saveError}</p>
        )}
        {saveOk && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Mail connected — AI context will include your recent emails.
          </p>
        )}

        {/* Test result */}
        {testResult && (
          <p className={`text-xs ${testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--red-status)]"}`}>
            {testResult.ok ? "✓" : "✗"} {testResult.msg}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--navy)] text-white text-sm font-medium hover:bg-[var(--navy-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : status?.configured ? "Update" : "Save & Connect"}
          </button>
          {status?.configured && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 rounded-lg border border-[var(--shell-border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] disabled:opacity-50 transition-colors"
            >
              {testing ? "Testing…" : "Test Connection"}
            </button>
          )}
        </div>

        <p className="text-[11px] text-[var(--text-muted)]">
          Credentials are stored in a server-side httpOnly cookie scoped to{" "}
          <code className="font-mono">/api/connectors/imap</code> only — never
          accessible to browser scripts or other API routes.
        </p>
      </form>
    </section>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ConnectorsSettings() {
  return (
    <div className="space-y-8">
      <TeamsSection />
      <hr className="border-[var(--shell-border)]" />
      <ImapSection />
    </div>
  );
}
