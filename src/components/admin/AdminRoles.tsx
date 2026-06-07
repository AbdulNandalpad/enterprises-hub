"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
// xlsx removed — template download and import now use plain CSV
import { TabBar, SectionCard, Badge, Btn } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";
import { useRoles } from "@/contexts/RolesContext";
import { useDemoMode } from "@/lib/demo/useDemoMode";
import { DEMO_USERS } from "@/lib/demo/fixtures";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus = "active" | "pending" | "suspended";

interface TenantUser {
  id:         string;
  email:      string;
  name:       string;
  roles:      string[];
  status:     UserStatus;
  invited_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES = ["Admin", "Manager", "Employee", "Read-only"];

const MATRIX_ROWS = [
  { role: "Admin",     vals: ["✅","✅","✅","✅","✅","✅"] },
  { role: "Manager",   vals: ["✅","✅","👁","✅","✅","—"] },
  { role: "Employee",  vals: ["👁","✅","—","👁","✅","—"] },
  { role: "Read-only", vals: ["👁","👁","—","👁","👁","—"] },
];
const MATRIX_COLS = ["Dashboard", "Tasks", "Search", "Connectors", "AI Panel", "Admin"];

// ── HCM system definitions ────────────────────────────────────────────────────

const HCM_SYSTEMS = [
  {
    id: "successfactors",
    name: "SAP SuccessFactors",
    logo: "🏢",
    desc: "Sync employees and org units via the SuccessFactors OData API or SCIM 2.0.",
    methods: ["SCIM 2.0", "OData API", "CSV export"],
    docs: "https://help.sap.com/successfactors",
  },
  {
    id: "workday",
    name: "Workday",
    logo: "🌐",
    desc: "Pull workers and security groups from Workday RaaS or SCIM provisioning.",
    methods: ["SCIM 2.0", "Workday RaaS", "CSV export"],
    docs: "https://doc.workday.com",
  },
  {
    id: "oracle",
    name: "Oracle HCM Cloud",
    logo: "🔴",
    desc: "Sync employees via Oracle SCIM or HCM Extracts.",
    methods: ["SCIM 2.0", "HCM Extracts", "CSV export"],
    docs: "https://docs.oracle.com/en/cloud/saas/human-resources",
  },
  {
    id: "bamboohr",
    name: "BambooHR",
    logo: "🎋",
    desc: "Sync employees via the BambooHR REST API (API key required).",
    methods: ["REST API", "CSV export"],
    docs: "https://documentation.bamboohr.com",
  },
  {
    id: "adp",
    name: "ADP Workforce Now",
    logo: "💼",
    desc: "Connect via ADP Marketplace API or periodic CSV export from ADP.",
    methods: ["ADP API", "CSV export"],
    docs: "https://developers.adp.com",
  },
  {
    id: "azure-ad",
    name: "Azure AD / Entra ID",
    logo: "🔷",
    desc: "Already connected via SSO. Enable SCIM auto-provisioning to sync group memberships to roles.",
    methods: ["SCIM 2.0 (Azure → Enterprises Hub)"],
    docs: "https://learn.microsoft.com/en-us/azure/active-directory/app-provisioning",
    recommended: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "active")    return <Badge variant="green">Active</Badge>;
  if (status === "pending")   return <Badge variant="amber">Pending invite</Badge>;
  if (status === "suspended") return <Badge variant="red">Suspended</Badge>;
  return null;
}

const inputCls = "w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--admin)] placeholder:text-[var(--text-muted)]";

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (u: TenantUser) => void }) {
  const [form, setForm]   = useState({ name: "", email: "", roles: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function toggleRole(r: string) {
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res  = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json() as { user?: TenantUser; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onInvited(data.user!);
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 p-4">
      <div className="w-full max-w-md bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--shell-border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Invite a user</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Full name <span className="text-red-500">*</span></label>
            <input className={inputCls} placeholder="Jane Doe" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Work email <span className="text-red-500">*</span></label>
            <input className={inputCls} type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => toggleRole(r)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${form.roles.includes(r) ? "bg-[var(--admin-bg)] text-[var(--admin)] border-[var(--admin-border)] font-semibold" : "border-[var(--shell-border)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"}`}
                >{r}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || !form.name || !form.email}
              className="flex-1 px-4 py-2 bg-[var(--admin)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? "Inviting…" : "Send invite"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-[var(--shell-border)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit roles popover ────────────────────────────────────────────────────────

function EditRolesPopover({ user, onSave, onClose }: { user: TenantUser; onSave: (email: string, roles: string[]) => void; onClose: () => void }) {
  const [roles, setRoles]   = useState<string[]>(user.roles);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, roles }) });
      onSave(user.email, roles);
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="absolute right-0 top-8 z-20 w-52 bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl shadow-xl p-3">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Edit roles</p>
      <div className="flex flex-col gap-1.5 mb-3">
        {ALL_ROLES.map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r])} className="accent-[var(--admin)]" />
            <span className="text-xs text-[var(--text-secondary)]">{r}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button onClick={handleSave} disabled={saving} className="flex-1 py-1 text-[11px] font-semibold bg-[var(--admin)] text-white rounded-lg hover:opacity-90 disabled:opacity-40">{saving ? "…" : "Save"}</button>
        <button onClick={onClose} className="flex-1 py-1 text-[11px] border border-[var(--shell-border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">Cancel</button>
      </div>
    </div>
  );
}

// ── Excel Import tab ──────────────────────────────────────────────────────────

interface ParsedRow { name: string; email: string; roles: string[]; _valid: boolean; _error?: string }

function ExcelImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows]         = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState("");

  function downloadTemplate() {
    const csvContent = [
      "name,email,roles",
      "Jane Doe,jane@company.com,Manager",
      "John Smith,john@company.com,\"Employee,Read-only\"",
    ].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = "user-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Parse a CSV string — handles quoted fields (RFC 4180). */
  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    function splitLine(line: string): string[] {
      const fields: string[] = [];
      let cur = "", inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
          else inQuote = !inQuote;
        } else if (ch === "," && !inQuote) {
          fields.push(cur.trim()); cur = "";
        } else {
          cur += ch;
        }
      }
      fields.push(cur.trim());
      return fields;
    }

    const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
    return lines.slice(1).map((line) => {
      const values = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(""); setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target!.result as string;
        const raw  = parseCsv(text);

        const parsed: ParsedRow[] = raw.map((row) => {
          const name  = (row["name"]  ?? row["full name"] ?? "").trim();
          const email = (row["email"] ?? row["e-mail"]    ?? "").toLowerCase().trim();
          const roleRaw = (row["roles"] ?? row["role"] ?? "").trim();
          const roles = roleRaw.split(/[,;]/).map((r) => r.trim()).filter((r) => ALL_ROLES.includes(r));

          const valid = !!name && email.includes("@");
          return {
            name, email, roles, _valid: valid,
            _error: !valid ? (!name ? "Missing name" : "Invalid email") : undefined,
          };
        });

        setRows(parsed);
      } catch {
        setParseError("Could not read file. Make sure it is a valid .csv file.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    const valid = rows.filter((r) => r._valid);
    if (!valid.length) return;
    setImporting(true); setResult(null);
    try {
      const res  = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: valid.map(({ name, email, roles }) => ({ name, email, roles })) }),
      });
      const data = await res.json();
      setResult(data);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
    } finally { setImporting(false); }
  }

  const validCount   = rows.filter((r) => r._valid).length;
  const invalidCount = rows.filter((r) => !r._valid).length;

  return (
    <SectionCard title="Import Users from CSV">
      <div className="p-5 space-y-5">

        {/* Instructions */}
        <div className="rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] p-4 text-xs text-[var(--text-secondary)] space-y-1.5">
          <p className="font-semibold text-[var(--admin)] mb-1">How it works</p>
          <p>1. Download the CSV template, fill it in Excel or Google Sheets, and save as <strong>.csv</strong>.</p>
          <p>2. The <strong>roles</strong> column accepts comma-separated values (quoted if multiple): <code className="font-mono bg-[var(--shell-bg)] px-1 rounded">Admin, Manager, Employee, Read-only</code></p>
          <p>3. Upload the CSV — preview appears below. Only valid rows are imported. Existing users are skipped (not overwritten).</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 items-center">
          <button onClick={downloadTemplate}
            className="text-xs font-semibold px-4 py-2 border border-[var(--admin-border)] text-[var(--admin)] bg-[var(--admin-bg)] rounded-lg hover:bg-[var(--admin)] hover:text-white transition-colors">
            ↓ Download Template
          </button>
          <label className="cursor-pointer text-xs font-semibold px-4 py-2 bg-[var(--admin)] text-white rounded-lg hover:opacity-90 transition-opacity">
            Upload File
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {/* Parse error */}
        {parseError && <p className="text-xs text-red-500">{parseError}</p>}

        {/* Result banner */}
        {result && (
          <div className={`rounded-lg border p-3 text-xs ${result.created > 0 ? "bg-[var(--green-bg)] border-[var(--green-border)]" : "bg-[var(--shell-bg)] border-[var(--shell-border)]"}`}>
            <p className="font-semibold text-[var(--text-primary)] mb-1">
              Import complete — {result.created} created, {result.skipped} skipped
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[var(--text-muted)]">
                {result.errors.map((e, i) => <li key={i}>⚠ {e}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Preview — {rows.length} rows
                {invalidCount > 0 && <span className="ml-2 text-[var(--amber-status)]">({invalidCount} invalid, will be skipped)</span>}
              </p>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="text-xs font-semibold px-4 py-1.5 bg-[var(--admin)] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {importing ? "Importing…" : `Import ${validCount} user${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>

            <div className="border border-[var(--shell-border)] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-2 px-3 py-2 bg-[var(--shell-bg)] border-b border-[var(--shell-border)]">
                {["Name", "Email", "Roles", "Status"].map((h) => (
                  <span key={h} className="font-mono text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">{h}</span>
                ))}
              </div>
              {rows.map((row, i) => (
                <div key={i} className={`grid grid-cols-[2fr_2fr_2fr_1fr] gap-2 px-3 py-2 border-b border-[var(--shell-border)] last:border-0 text-xs ${!row._valid ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                  <span className="text-[var(--text-primary)] truncate">{row.name || <span className="text-[var(--text-muted)] italic">—</span>}</span>
                  <span className="text-[var(--text-secondary)] truncate font-mono text-[11px]">{row.email || <span className="text-[var(--text-muted)] italic">—</span>}</span>
                  <span className="flex flex-wrap gap-1">
                    {row.roles.length > 0
                      ? row.roles.map((r) => <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg)] text-[var(--admin)] border border-[var(--admin-border)]">{r}</span>)
                      : <span className="text-[var(--text-muted)] italic">No roles</span>}
                  </span>
                  <span>
                    {row._valid
                      ? <Badge variant="green">Ready</Badge>
                      : <span className="text-[10px] text-red-500">⚠ {row._error}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── HCM Sync tab ──────────────────────────────────────────────────────────────

function HcmSyncTab() {
  const tenant = useTenant();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected]   = useState<Set<string>>(new Set());

  const scimEndpoint = `https://api.enterprises-hub.de/scim/v2/${tenant.slug}`;

  return (
    <div className="space-y-5 p-5">

      {/* SCIM endpoint info */}
      <SectionCard title="Your SCIM 2.0 Provisioning Endpoint">
        <div className="p-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Point your HCM system (or Azure AD) at this endpoint to automatically provision and deprovision users
            whenever your org chart changes. Users are synced in real-time with role mappings you configure below.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] truncate">
              {scimEndpoint}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(scimEndpoint)}
              className="text-xs px-3 py-2 border border-[var(--shell-border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <div className="rounded-lg bg-[var(--amber-bg)] border border-[var(--amber-border)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            <strong className="text-[var(--amber-status)]">Bearer token required.</strong>{" "}
            Contact <a href="mailto:support@enterprises-hub.de" className="underline">support@enterprises-hub.de</a> to generate a provisioning token for your tenant.
          </div>
        </div>
      </SectionCard>

      {/* HCM system cards */}
      <SectionCard title="Connect an HCM System">
        <div className="p-4 grid grid-cols-2 gap-4">
          {HCM_SYSTEMS.map((sys) => {
            const isConnected = connected.has(sys.id);
            const isConnecting = connecting === sys.id;

            return (
              <div
                key={sys.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${isConnected ? "border-[var(--green-border)] bg-[var(--green-bg)]" : "border-[var(--shell-border)] bg-[var(--shell-surface)] hover:border-[var(--admin-border)]"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sys.logo}</span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{sys.name}</p>
                      {sys.recommended && (
                        <span className="text-[10px] font-semibold text-[var(--admin)] bg-[var(--admin-bg)] px-1.5 py-0.5 rounded border border-[var(--admin-border)]">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>
                  {isConnected && <Badge variant="green">Connected</Badge>}
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{sys.desc}</p>

                <div className="flex flex-wrap gap-1">
                  {sys.methods.map((m) => (
                    <span key={m} className="text-[10px] px-2 py-0.5 rounded border border-[var(--shell-border)] text-[var(--text-muted)]">{m}</span>
                  ))}
                </div>

                <div className="flex gap-2 mt-auto">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => setConnected((s) => { const n = new Set(s); n.delete(sys.id); return n; })}
                        className="flex-1 text-xs py-1.5 border border-[var(--shell-border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors"
                      >
                        Disconnect
                      </button>
                      <button className="flex-1 text-xs py-1.5 bg-[var(--admin)] text-white rounded-lg hover:opacity-90 transition-opacity font-semibold">
                        Sync Now
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={sys.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-xs py-1.5 border border-[var(--shell-border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors text-center"
                      >
                        Docs ↗
                      </a>
                      <button
                        onClick={() => {
                          setConnecting(sys.id);
                          setTimeout(() => {
                            setConnecting(null);
                            setConnected((s) => new Set(s).add(sys.id));
                          }, 1200);
                        }}
                        disabled={isConnecting}
                        className="flex-1 text-xs py-1.5 bg-[var(--admin)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-semibold"
                      >
                        {isConnecting ? "Connecting…" : "Connect"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Sync schedule */}
      <SectionCard title="Sync Schedule">
        <div className="p-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Automatic sync pulls the latest employee roster from connected HCM systems and updates roles accordingly.
            New employees are added as <em>pending</em>; departures are suspended automatically.
          </p>
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-[var(--text-primary)]">Sync every</label>
            <select className="text-xs bg-[var(--shell-bg)] border border-[var(--shell-border)] rounded-lg px-3 py-1.5 text-[var(--text-primary)]">
              <option>1 hour</option>
              <option>6 hours</option>
              <option selected>24 hours</option>
              <option>Manual only</option>
            </select>
            <span className="text-xs text-[var(--text-muted)]">Last sync: never</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminRoles() {
  const isDemoMode  = useDemoMode();
  const tenant      = useTenant();
  const { isAdmin } = useRoles();

  // Tabs: Admin gets all 4; Manager only gets Users
  const tabs = isAdmin
    ? ["Users", "Role Config", "Excel Import", "HCM Sync"]
    : ["Users"];

  const [tab, setTab]           = useState("Users");
  const [users, setUsers]       = useState<TenantUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  useEffect(() => {
    // Demo: load fixture users without hitting the API
    if (isDemoMode) {
      setUsers(DEMO_USERS as TenantUser[]);
      setLoading(false);
      return;
    }
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: TenantUser[]; error?: string }) => {
        if (d.error) { setFetchError(d.error); return; }
        setUsers(d.users ?? []);
      })
      .catch(() => setFetchError("Could not load users."))
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  async function handleRemove(email: string) {
    if (isDemoMode) return; // read-only in demo
    if (!confirm(`Remove ${email} from this workspace?`)) return;
    await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.email !== email));
  }

  async function handleToggleSuspend(user: TenantUser) {
    if (isDemoMode) return; // read-only in demo
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, status: newStatus }),
    });
    setUsers((prev) => prev.map((u) => u.email === user.email ? { ...u, status: newStatus } : u));
  }

  const initials     = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const avatarColors = [
    { bg: "var(--admin-bg)",  color: "var(--admin)" },
    { bg: "var(--active-bg)", color: "var(--active-text)" },
    { bg: "var(--green-bg)",  color: "var(--green-status)" },
    { bg: "var(--amber-bg)",  color: "var(--amber-status)" },
  ];

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Users & Roles</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage users, assign roles, and control workspace access for {tenant.name}.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      <TabBar tabs={tabs} active={tab} onChange={setTab} admin />

      {/* ── Users tab ── */}
      {tab === "Users" && (
        <SectionCard
          title={`Workspace — ${tenant.brandName}`}
          action={isAdmin ? <Btn onClick={() => setShowInvite(true)}>+ Invite User</Btn> : undefined}
        >
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Loading users…</div>
          ) : fetchError ? (
            <div className="px-4 py-6 text-sm text-red-500">
              {fetchError.includes("tenant_users") ? (
                <span>
                  Run the migration SQL to enable user management.{" "}
                  <button className="underline text-[var(--admin)]"
                    onClick={() => alert(
                      "Run in Supabase SQL Editor:\n\n" +
                      "create table public.tenant_users (\n" +
                      "  id uuid primary key default gen_random_uuid(),\n" +
                      "  tenant_slug text not null,\n" +
                      "  email text not null,\n" +
                      "  name text not null,\n" +
                      "  roles text[] not null default '{}',\n" +
                      "  status text not null default 'pending' check (status in ('pending','active','suspended')),\n" +
                      "  invited_at timestamptz not null default now(),\n" +
                      "  unique(tenant_slug, email)\n" +
                      ");\n\n" +
                      "alter table public.tenant_users enable row level security;\n" +
                      "grant all on public.tenant_users to service_role;\n" +
                      "create policy \"Service role full access\" on public.tenant_users for all to service_role using (true) with check (true);"
                    )}>
                    Show SQL ↗
                  </button>
                </span>
              ) : fetchError}
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No users yet</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">Invite your first team member to get started.</p>
              {isAdmin && <Btn onClick={() => setShowInvite(true)}>+ Invite User</Btn>}
            </div>
          ) : (
            users.map((u, i) => {
              const av = avatarColors[i % avatarColors.length];
              const isEditing = editingEmail === u.email;
              return (
                <div key={u.email} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)] transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                    style={{ background: av.bg, color: av.color }}>{initials(u.name)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.name}</span>
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{u.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.roles.length === 0 ? (
                        <span className="text-[10px] text-[var(--text-muted)] italic">No roles assigned</span>
                      ) : u.roles.map((r) => (
                        <span key={r} className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded border bg-[var(--admin-bg)] text-[var(--admin)] border-[var(--admin-border)]">{r}</span>
                      ))}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="relative flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEditingEmail(isEditing ? null : u.email)} className="text-[11px] text-[var(--admin)] hover:underline">Edit roles</button>
                      <button onClick={() => handleToggleSuspend(u)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--amber-status)]">
                        {u.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                      <button onClick={() => handleRemove(u.email)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--red-status)]">Remove</button>

                      {isEditing && (
                        <EditRolesPopover
                          user={u}
                          onSave={(email, roles) => setUsers((prev) => prev.map((x) => x.email === email ? { ...x, roles } : x))}
                          onClose={() => setEditingEmail(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </SectionCard>
      )}

      {/* ── Role Config tab ── */}
      {tab === "Role Config" && (
        <SectionCard title="Role → System Visibility Matrix">
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--shell-border)]">
                  <th className="text-left py-2 px-3 text-[var(--text-muted)] font-semibold">Role</th>
                  {MATRIX_COLS.map((c) => (
                    <th key={c} className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row) => (
                  <tr key={row.role} className="border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)]">
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{row.role}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="text-center py-2.5 px-2"
                        style={{ color: v === "✅" ? "var(--green-status)" : v === "👁" ? "var(--active-text)" : "var(--text-muted)" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--text-muted)] mt-3">✅ Full access &nbsp;·&nbsp; 👁 Read only &nbsp;·&nbsp; — Hidden</p>
          </div>
        </SectionCard>
      )}

      {/* ── Excel Import tab ── */}
      {tab === "Excel Import" && <ExcelImportTab />}

      {/* ── HCM Sync tab ── */}
      {tab === "HCM Sync" && <HcmSyncTab />}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={(u) => setUsers((prev) => [u, ...prev])} />
      )}
    </div>
  );
}
