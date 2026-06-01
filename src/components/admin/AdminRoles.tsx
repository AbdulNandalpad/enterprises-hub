"use client";

import { useState, useEffect, type FormEvent } from "react";
import { TabBar, SectionCard, Badge, Btn } from "./AdminUI";
import { useTenant } from "@/contexts/TenantContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus = "active" | "pending" | "suspended";

interface TenantUser {
  id:          string;
  email:       string;
  name:        string;
  roles:       string[];
  status:      UserStatus;
  invited_at:  string;
}

// ── Available roles ───────────────────────────────────────────────────────────

const ALL_ROLES = ["Admin", "Manager", "Employee", "Read-only"];

// ── Role → system visibility matrix ──────────────────────────────────────────

const MATRIX_ROWS = [
  { role: "Admin",     vals: ["✅","✅","✅","✅","✅","✅"] },
  { role: "Manager",   vals: ["✅","✅","👁","✅","✅","—"] },
  { role: "Employee",  vals: ["👁","✅","—","👁","✅","—"] },
  { role: "Read-only", vals: ["👁","👁","—","👁","👁","—"] },
];
const MATRIX_COLS = ["Dashboard", "Tasks", "Search", "Connectors", "AI Panel", "Admin"];

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "active")    return <Badge variant="green">Active</Badge>;
  if (status === "pending")   return <Badge variant="amber">Pending invite</Badge>;
  if (status === "suspended") return <Badge variant="red">Suspended</Badge>;
  return null;
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (u: TenantUser) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", roles: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function toggleRole(r: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { user?: TenantUser; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onInvited(data.user!);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-[var(--shell-bg)] border border-[var(--shell-border)] text-[var(--text-primary)] text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[var(--admin)] placeholder:text-[var(--text-muted)]";

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
            <input
              className={inputCls}
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Work email <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    form.roles.includes(r)
                      ? "bg-[var(--admin-bg)] text-[var(--admin)] border-[var(--admin-border)] font-semibold"
                      : "border-[var(--shell-border)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !form.name || !form.email}
              className="flex-1 px-4 py-2 bg-[var(--admin)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Inviting…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--shell-border)] text-[var(--text-secondary)] text-sm rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit roles popover ────────────────────────────────────────────────────────

function EditRolesPopover({
  user,
  onSave,
  onClose,
}: {
  user: TenantUser;
  onSave: (email: string, roles: string[]) => void;
  onClose: () => void;
}) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [saving, setSaving] = useState(false);

  function toggleRole(r: string) {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, roles }),
      });
      onSave(user.email, roles);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute right-0 top-8 z-20 w-52 bg-[var(--shell-surface)] border border-[var(--shell-border)] rounded-xl shadow-xl p-3">
      <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Edit roles</p>
      <div className="flex flex-col gap-1.5 mb-3">
        {ALL_ROLES.map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={roles.includes(r)}
              onChange={() => toggleRole(r)}
              className="accent-[var(--admin)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">{r}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-1 text-[11px] font-semibold bg-[var(--admin)] text-white rounded-lg hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-1 text-[11px] border border-[var(--shell-border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminRoles() {
  const tenant = useTenant();
  const [tab, setTab] = useState("Users");
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: { users?: TenantUser[]; error?: string }) => {
        if (d.error) { setFetchError(d.error); return; }
        setUsers(d.users ?? []);
      })
      .catch(() => setFetchError("Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email} from this workspace?`)) return;
    await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.email !== email));
  }

  async function handleToggleSuspend(user: TenantUser) {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, status: newStatus }),
    });
    setUsers((prev) => prev.map((u) => u.email === user.email ? { ...u, status: newStatus } : u));
  }

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const avatarColors = [
    { bg: "var(--admin-bg)",   color: "var(--admin)" },
    { bg: "var(--active-bg)",  color: "var(--active-text)" },
    { bg: "var(--green-bg)",   color: "var(--green-status)" },
    { bg: "var(--amber-bg)",   color: "var(--amber-status)" },
  ];

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Users & Roles</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage users, assign roles, and control system visibility for {tenant.name}.
        </p>
      </div>
      <div className="h-px bg-[var(--shell-border)] my-4" />

      <TabBar tabs={["Users", "Role Config"]} active={tab} onChange={setTab} admin />

      {/* ── Users tab ── */}
      {tab === "Users" && (
        <SectionCard
          title={`Workspace — ${tenant.brandName}`}
          action={<Btn onClick={() => setShowInvite(true)}>+ Invite User</Btn>}
        >
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Loading users…</div>
          ) : fetchError ? (
            <div className="px-4 py-6 text-sm text-red-500">
              {fetchError.includes("tenant_users") ? (
                <span>
                  Run the migration SQL to enable user management.{" "}
                  <button
                    className="underline text-[var(--admin)]"
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
                    )}
                  >
                    Show SQL ↗
                  </button>
                </span>
              ) : fetchError}
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No users yet</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Invite your first team member to get started.
              </p>
              <Btn onClick={() => setShowInvite(true)}>+ Invite User</Btn>
            </div>
          ) : (
            users.map((u, i) => {
              const av = avatarColors[i % avatarColors.length];
              const isEditing = editingEmail === u.email;
              return (
                <div
                  key={u.email}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[var(--shell-border)] last:border-0 hover:bg-[var(--shell-bg)] transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                    style={{ background: av.bg, color: av.color }}
                  >
                    {initials(u.name)}
                  </div>

                  {/* Info */}
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
                        <span
                          key={r}
                          className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded border bg-[var(--admin-bg)] text-[var(--admin)] border-[var(--admin-border)]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingEmail(isEditing ? null : u.email)}
                      className="text-[11px] text-[var(--admin)] hover:underline"
                    >
                      Edit roles
                    </button>
                    <button
                      onClick={() => handleToggleSuspend(u)}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--amber-status)]"
                    >
                      {u.status === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                    <button
                      onClick={() => handleRemove(u.email)}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--red-status)]"
                    >
                      Remove
                    </button>

                    {isEditing && (
                      <EditRolesPopover
                        user={u}
                        onSave={(email, roles) =>
                          setUsers((prev) => prev.map((x) => x.email === email ? { ...x, roles } : x))
                        }
                        onClose={() => setEditingEmail(null)}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </SectionCard>
      )}

      {/* ── Role config tab ── */}
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
                      <td
                        key={i}
                        className="text-center py-2.5 px-2"
                        style={{
                          color: v === "✅" ? "var(--green-status)" : v === "👁" ? "var(--active-text)" : "var(--text-muted)",
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-[var(--text-muted)] mt-3">
              ✅ Full access &nbsp;·&nbsp; 👁 Read only &nbsp;·&nbsp; — Hidden
            </p>
          </div>
        </SectionCard>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={(u) => setUsers((prev) => [u, ...prev])}
        />
      )}
    </div>
  );
}
