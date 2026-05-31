/**
 * IMAP connector shared types.
 * Import-safe on both server and client.
 */

/** Known IMAP provider presets */
export type ImapProvider = "ionos" | "gmail" | "outlook" | "custom";

export interface ImapCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
}

export interface ImapMessage {
  uid: number;
  subject: string;
  from: string;
  date: string;
  /** First ~200 chars of the plain-text body */
  snippet: string;
}

/** Provider preset host/port defaults */
export const IMAP_PRESETS: Record<ImapProvider, Pick<ImapCredentials, "host" | "port" | "tls">> = {
  ionos:   { host: "imap.ionos.com",          port: 993, tls: true },
  gmail:   { host: "imap.gmail.com",           port: 993, tls: true },
  outlook: { host: "outlook.office365.com",    port: 993, tls: true },
  custom:  { host: "",                          port: 993, tls: true },
};

export const IMAP_PROVIDER_LABELS: Record<ImapProvider, string> = {
  ionos:   "IONOS",
  gmail:   "Gmail",
  outlook: "Outlook / Hotmail",
  custom:  "Custom",
};
