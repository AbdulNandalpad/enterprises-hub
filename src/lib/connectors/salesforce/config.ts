/**
 * Salesforce connector — no env vars needed.
 * All credentials (client_id, client_secret, instance_url) are stored
 * per-tenant in the connector_configs Supabase table, registered via
 * Admin → Connectors. Nothing is hardcoded here.
 */

export const SF_COOKIE = {
  /** Derives a short key from a configId UUID for cookie naming */
  key: (configId: string) => configId.replace(/-/g, "").slice(0, 12),
  token:   (short: string) => `sf_token_${short}`,
  inst:    (short: string) => `sf_inst_${short}`,
  refresh: (short: string) => `sf_refresh_${short}`,
} as const;
