"use client";

/**
 * RolesContext
 *
 * Fetches the current MSAL user's roles from the tenant_users table and
 * exposes them throughout the app via useRoles().
 *
 * Provides:
 *   roles         — string[] of role names ("Admin", "Manager", etc.)
 *   isAdmin       — shorthand boolean
 *   isManager     — shorthand boolean
 *   canSeeSearch  — whether the Search nav item should show
 *   canSeeAdmin   — whether the admin section should show at all
 *   allowedAdminSections — which /dashboard/admin/* slugs are accessible
 *   loading       — true while roles are being fetched
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useMsal } from "@azure/msal-react";

// ── Permission rules (mirrors the Role Config matrix) ─────────────────────────

const ADMIN_SECTIONS_ALL = [
  "overview", "connectors", "builder", "marketplace",
  "roles", "branding", "auth", "audit", "sdk", "governance",
];

const ADMIN_SECTIONS_MANAGER = ["overview", "roles", "audit"];

function derivePermissions(roles: string[]) {
  const admin   = roles.includes("Admin");
  const manager = roles.includes("Manager");

  return {
    isAdmin:              admin,
    isManager:            manager,
    canSeeSearch:         admin || manager,
    canSeeAdmin:          admin || manager,
    allowedAdminSections: admin
      ? ADMIN_SECTIONS_ALL
      : manager
        ? ADMIN_SECTIONS_MANAGER
        : [],
  };
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface RolesCtx {
  roles:                string[];
  isAdmin:              boolean;
  isManager:            boolean;
  canSeeSearch:         boolean;
  canSeeAdmin:          boolean;
  allowedAdminSections: string[];
  loading:              boolean;
}

const defaultCtx: RolesCtx = {
  roles: [], isAdmin: false, isManager: false,
  canSeeSearch: false, canSeeAdmin: false,
  allowedAdminSections: [], loading: true,
};

const Ctx = createContext<RolesCtx>(defaultCtx);

export function useRoles() {
  return useContext(Ctx);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function RolesProvider({ children }: { children: ReactNode }) {
  const { accounts } = useMsal();
  const [state, setState] = useState<RolesCtx>(defaultCtx);

  useEffect(() => {
    const email = accounts[0]?.username ?? accounts[0]?.idTokenClaims?.preferred_username as string | undefined;

    if (!email) {
      // Not logged in — no roles
      setState({ ...defaultCtx, loading: false });
      return;
    }

    fetch(`/api/user/me?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d: { roles?: string[] }) => {
        const roles = d.roles ?? [];
        setState({ roles, loading: false, ...derivePermissions(roles) });
      })
      .catch(() => {
        // If lookup fails, grant no roles (fail-closed)
        setState({ ...defaultCtx, loading: false });
      });
  }, [accounts]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
