/**
 * Integration types — shared across registry, API, and UI.
 *
 * An "integration" is anything that connects Enterprise Hub to an external
 * system — whether it feeds Hub AI with live data, provides an app launcher
 * in the sidebar, or both.
 */

// ─── Registry ─────────────────────────────────────────────────────────────────

export type IntegrationCategory =
  | "AI Data Sources"
  | "ERP"
  | "CRM"
  | "Marketing"
  | "Communication"
  | "ITSM"
  | "Cloud & DevOps"
  | "Identity"
  | "Productivity";

/**
 * How an integration is configured:
 *   always-on            — active for all Azure AD users, no setup needed
 *   shared-org-oauth     — admin registers OAuth credentials (Salesforce pattern)
 *   shared-org-api       — admin registers API key / basic-auth credentials (SAP pattern)
 *   shared-org-mcp       — admin registers MCP server URL + bearer token
 *   personal-oauth       — each user grants consent (Teams pattern)
 *   personal-credentials — each user enters IMAP / CalDAV credentials
 *   app-link             — URL launcher only, no API
 */
export type ConfigType =
  | "always-on"
  | "shared-org-oauth"
  | "shared-org-api"
  | "shared-org-mcp"
  | "personal-oauth"
  | "personal-credentials"
  | "app-link";

export interface IntegrationDef {
  id:          string;
  name:        string;
  description: string;
  category:    IntegrationCategory;
  color:       string;
  logo:        string;        // AppIcon slug (falls back to 2-letter abbr)
  configType:  ConfigType;
  /** Feeds live data into Hub AI context / report builder */
  aiContext:   boolean;
  /** Connector type key used in legacy connector_configs table (SAP/SF only) */
  legacyConnectorType?: string;
  /** Web app URL — used as the sidebar link and "Open" button */
  appUrl?:     string;
  /** Short label shown in the drawer under "Auth method" */
  authHint?:   string;
  docsUrl?:    string;
  /** OAuth / Graph scopes (for display in drawer) */
  scopes?:     string[];
}

// ─── State (per tenant, from DB) ─────────────────────────────────────────────

export type IntegrationStatus =
  | "connected"       // configured + tested OK
  | "error"           // configured but last test failed
  | "not_configured"  // in registry but no tenant config yet
  | "always_on";      // active without config (Azure AD / Graph)

export interface IntegrationState {
  integration_id:  string;
  enabled:         boolean;
  show_in_nav:     boolean;
  nav_label?:      string;
  status:          IntegrationStatus;
  instance_url?:   string;   // redacted credential — for display only
  last_tested_at?: string;
}

/** Merged view: registry metadata + tenant state */
export type IntegrationView = IntegrationDef & IntegrationState;
