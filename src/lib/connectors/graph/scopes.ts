/**
 * Microsoft Graph OAuth scopes used by the connector.
 *
 * BASE_SCOPES — granted at login (already in loginRequest).
 * CALENDAR_SCOPES — acquired via incremental consent on first use.
 *
 * If you want calendar data without an extra consent prompt,
 * add "Calendars.Read" to the `loginRequest.scopes` array in src/lib/msal.ts.
 */

export const GRAPH_BASE_SCOPES     = ["User.Read"] as const;
export const GRAPH_CALENDAR_SCOPES = ["Calendars.Read"] as const;
export const GRAPH_MAIL_SCOPES     = ["Mail.ReadBasic"] as const;

/** Full Graph base URL */
export const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
