/**
 * Domain model — the typed contracts shared across tiers.
 * Tiers import types from here; they never import each other's internals.
 */

export type TenantStatus = "provisioning" | "active" | "suspended";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  /** Azure AD directory (organization) id this tenant's users sign in from. */
  ssoOrgId: string;
  region: string;
  status: TenantStatus;
  /** Isolated Postgres schema backing this tenant (Tier-1 silo). */
  schemaName: string;
  createdAt: Date;
}

export type Role = "member" | "company_admin";

export interface SessionUser {
  /** Azure AD object id. */
  sub: string;
  name: string;
  email: string;
  tenantSlug: string;
  role: Role;
}

export type ConnectorId = "sap" | "salesforce";

export type ConnectorHealth =
  | { state: "healthy"; latencyMs: number }
  | { state: "degraded"; latencyMs: number; reason: string }
  | { state: "down"; reason: string };

export interface ConnectorConfigMeta {
  connectorId: ConnectorId;
  enabled: boolean;
  /** What the connector may read — shown in admin, enforced in the connector. */
  scopes: string[];
  configuredAt: Date;
}

/** Every AI action is auditable (security rule 2). Append-only. */
export interface AuditEvent {
  at: Date;
  userSub: string;
  userName: string;
  kind: "question" | "report_run" | "connector_test";
  question: string;
  systems: ConnectorId[];
  outcome: "answered" | "refused_not_entitled" | "failed" | "delivered";
  detail: string;
}
