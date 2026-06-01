/**
 * CalDAV connector types.
 * Used for IONOS Calendar (and any CalDAV-compatible calendar server).
 */

export interface CalDavCredentials {
  /** CalDAV server base URL — e.g. https://caldav.ionos.de */
  server: string;
  /** Email / username */
  user: string;
  /** Password */
  pass: string;
}

export interface CalDavEvent {
  uid: string;
  summary: string;
  start: string;      // ISO 8601
  end: string;        // ISO 8601
  isAllDay: boolean;
  location?: string;
}

/** Presets: server URL auto-filled based on provider */
export const CALDAV_PRESETS = {
  ionos:  { server: "https://caldav.ionos.de",     label: "IONOS" },
  custom: { server: "",                             label: "Custom" },
} as const;

export type CalDavProvider = keyof typeof CALDAV_PRESETS;
