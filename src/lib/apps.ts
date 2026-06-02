export type App = {
  id: string;
  name: string;
  category: string;
  color: string;
  logo: string;
  url: string;
};

export const apps: App[] = [
  // ─── Always-available shortcuts ──────────────────────────────────────────────
  { id: "servicesphere", name: "Servicesphere",        category: "Platform",      color: "#C8341A", logo: "servicesphere",     url: "https://app.servicesphere.de" },
  { id: "ionos-mail",    name: "IONOS Mail & Calendar", category: "Email",         color: "#003D8F", logo: "ionos",             url: "https://email.ionos.de/appsuite/#!!&app=io.ox/mail&folder=default0/INBOX" },
  { id: "teams",         name: "Microsoft Teams",       category: "Collaboration", color: "#6264A7", logo: "microsoftteams",    url: "https://teams.microsoft.com" },

  // ─── Generic shortcuts (shown only when no connector config exists) ───────────
  // Salesforce and SAP are intentionally omitted here — the Sidebar reads
  // instance names + URLs from the admin connector registry so each registered
  // org appears with its correct label (e.g. "Salesforce · Production").

  { id: "jira",       name: "Jira",       category: "Projects",  color: "#0052CC", logo: "jira",               url: "https://servicesphere-ug.atlassian.net/jira/software/projects/ECS/boards/1" },
  { id: "servicenow", name: "ServiceNow", category: "ITSM",      color: "#81B5A1", logo: "servicenow",         url: "https://your-instance.service-now.com" },
  { id: "adobe-sign", name: "Adobe Sign", category: "Documents", color: "#FF0000", logo: "adobeacrobatreader", url: "https://secure.adobesign.com" },
  { id: "power-bi",   name: "Power BI",   category: "Analytics", color: "#F2C811", logo: "powerbi",            url: "https://app.powerbi.com" },
];

export function getApp(id: string): App | undefined {
  return apps.find((a) => a.id === id);
}
