/**
 * Salesforce connector — configuration constants.
 * All values come from env vars; nothing is hardcoded client-side.
 */

export const SF_CONFIG = {
  clientId:     process.env.SF_CLIENT_ID     ?? "",
  clientSecret: process.env.SF_CLIENT_SECRET ?? "",
  instanceUrl:  process.env.SF_INSTANCE_URL  ?? "",
  redirectUri:  process.env.SF_REDIRECT_URI  ?? "",

  /** Use My Domain URL so Azure AD SSO kicks in automatically */
  authUrl:  `${process.env.SF_INSTANCE_URL ?? ""}/services/oauth2/authorize`,
  tokenUrl: "https://login.salesforce.com/services/oauth2/token",

  /** Cookie name where the access token is stored (httpOnly, server-only) */
  cookieName: "sf_access_token",
  instanceCookieName: "sf_instance_url",
} as const;
