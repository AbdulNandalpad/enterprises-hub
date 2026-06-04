/**
 * Integration registry — source of truth for every integration Enterprise Hub supports.
 *
 * Add a new integration here to make it appear in the Integrations page.
 * Runtime logic (API clients, MCP servers, context builders) lives separately.
 *
 * Import-safe on both server and client — no MSAL, no fetch, no secrets.
 */

import type { IntegrationDef } from "./types";

export const INTEGRATIONS: IntegrationDef[] = [

  // ── Always-on (Microsoft Graph / Azure AD) ─────────────────────────────────

  {
    id:          "microsoft-365",
    name:        "Microsoft 365",
    description: "User profile, calendar, email, and OneDrive via Microsoft Graph. Active for every Azure AD user — no admin setup required.",
    category:    "AI Data Sources",
    color:       "#0078D4",
    logo:        "microsoft",
    configType:  "always-on",
    aiContext:   true,
    scopes:      ["User.Read", "Mail.ReadBasic", "Calendars.Read", "Files.Read"],
    docsUrl:     "https://learn.microsoft.com/en-us/graph/overview",
  },
  {
    id:          "sharepoint",
    name:        "SharePoint",
    description: "Company documents, lists, and intranet news via Microsoft Graph. Active for Azure AD users with SharePoint access.",
    category:    "AI Data Sources",
    color:       "#038387",
    logo:        "microsoftsharepoint",
    configType:  "always-on",
    aiContext:   true,
    scopes:      ["Sites.Read.All", "Files.Read.All"],
    docsUrl:     "https://learn.microsoft.com/en-us/sharepoint/dev/",
  },

  // ── ERP ────────────────────────────────────────────────────────────────────

  {
    id:                   "sap-s4hana",
    name:                 "SAP S/4HANA",
    description:          "Live ERP data — orders, inventory, finance, and logistics via SAP OData API. Powers AI cross-system reporting.",
    category:             "ERP",
    color:                "#0070F3",
    logo:                 "sap",
    configType:           "shared-org-api",
    aiContext:            true,
    legacyConnectorType:  "sap_s4hana",
    authHint:             "Basic Auth — API service user + password",
    docsUrl:              "https://help.sap.com/docs/SAP_S4HANA_CLOUD",
  },
  {
    id:                   "sap-erp",
    name:                 "SAP ERP (Classic)",
    description:          "Legacy SAP ERP / R3 system data via OData or RFC. For on-premise SAP installations with API gateway.",
    category:             "ERP",
    color:                "#0070F3",
    logo:                 "sap",
    configType:           "shared-org-api",
    aiContext:            true,
    authHint:             "Basic Auth — API service user + password",
    docsUrl:              "https://help.sap.com/docs/SAP_NETWEAVER",
  },
  {
    id:          "sap-btp",
    name:        "SAP BTP",
    description: "SAP Business Technology Platform — integration hub for connecting SAP cloud services via MCP server.",
    category:    "ERP",
    color:       "#0070F3",
    logo:        "sap",
    configType:  "shared-org-mcp",
    aiContext:   true,
    authHint:    "MCP Server — URL + bearer token",
    docsUrl:     "https://help.sap.com/docs/btp",
  },

  // ── CRM ────────────────────────────────────────────────────────────────────

  {
    id:                   "salesforce-crm",
    name:                 "Salesforce CRM",
    description:          "Leads, opportunities, contacts, and cases via Salesforce REST API. Powers pipeline reports and AI account insights.",
    category:             "CRM",
    color:                "#00A1E0",
    logo:                 "salesforce",
    configType:           "shared-org-oauth",
    aiContext:            true,
    legacyConnectorType:  "salesforce",
    authHint:             "OAuth 2.0 — Consumer Key + Secret",
    docsUrl:              "https://developer.salesforce.com/docs/apis",
  },
  {
    id:                   "sap-sales-cloud",
    name:                 "SAP Sales Cloud",
    description:          "Accounts, opportunities, and activities via SAP C4C OData API. Unified CRM + ERP view in Hub AI.",
    category:             "CRM",
    color:                "#0070F3",
    logo:                 "sap",
    configType:           "shared-org-api",
    aiContext:            true,
    legacyConnectorType:  "sap_sales_cloud",
    authHint:             "Basic Auth — API service user + password",
    docsUrl:              "https://help.sap.com/docs/SAP_CLOUD_FOR_CUSTOMER",
  },
  {
    id:          "hubspot",
    name:        "HubSpot CRM",
    description: "Contacts, deals, and marketing attribution via HubSpot API.",
    category:    "CRM",
    color:       "#FF7A59",
    logo:        "hubspot",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "API Key (Private App token)",
    docsUrl:     "https://developers.hubspot.com/docs/api/overview",
  },
  {
    id:          "dynamics-365",
    name:        "Microsoft Dynamics 365",
    description: "Sales, customer service, and field service data via Dynamics 365 Web API.",
    category:    "CRM",
    color:       "#0078D4",
    logo:        "microsoftdynamics365",
    configType:  "shared-org-oauth",
    aiContext:   true,
    authHint:    "OAuth 2.0 — Azure AD app registration",
    docsUrl:     "https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview",
  },

  // ── Marketing ──────────────────────────────────────────────────────────────

  {
    id:          "salesforce-marketing",
    name:        "Salesforce Marketing Cloud",
    description: "Campaign performance, email analytics, and customer journey data via Marketing Cloud REST API.",
    category:    "Marketing",
    color:       "#00A1E0",
    logo:        "salesforce",
    configType:  "shared-org-oauth",
    aiContext:   true,
    authHint:    "OAuth 2.0 — Client ID + Secret",
    docsUrl:     "https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/apis-overview.html",
  },
  {
    id:          "emarsys",
    name:        "Emarsys (SAP)",
    description: "Omnichannel marketing engagement data — sends, opens, clicks, and segments via Emarsys REST API.",
    category:    "Marketing",
    color:       "#00274D",
    logo:        "emarsys",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "WSSE — API username + secret",
    docsUrl:     "https://dev.emarsys.com/",
  },
  {
    id:          "adobe-experience",
    name:        "Adobe Experience Cloud",
    description: "Campaign, Analytics, and Target data via Adobe Experience Platform APIs.",
    category:    "Marketing",
    color:       "#FF0000",
    logo:        "adobe",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "JWT / OAuth — Adobe Developer Console",
    docsUrl:     "https://developer.adobe.com/experience-cloud/",
  },
  {
    id:          "marketo",
    name:        "Marketo",
    description: "Lead management, campaigns, and scoring via Marketo REST API.",
    category:    "Marketing",
    color:       "#5C4281",
    logo:        "marketo",
    configType:  "shared-org-oauth",
    aiContext:   true,
    authHint:    "OAuth 2.0 — Client ID + Secret",
    docsUrl:     "https://developers.marketo.com/rest-api/",
  },

  // ── Communication ──────────────────────────────────────────────────────────

  {
    id:          "microsoft-teams",
    name:        "Microsoft Teams",
    description: "Teams membership and chat context via Microsoft Graph. Each user connects their own account.",
    category:    "Communication",
    color:       "#6264A7",
    logo:        "microsoftteams",
    configType:  "personal-oauth",
    aiContext:   true,
    scopes:      ["Team.ReadBasic.All", "Chat.ReadBasic"],
    appUrl:      "https://teams.microsoft.com",
    docsUrl:     "https://learn.microsoft.com/en-us/graph/teams-concept-overview",
  },
  {
    id:          "imap-email",
    name:        "IMAP Email",
    description: "Personal email inbox from IONOS, Gmail, Outlook, or any IMAP server. Per-user credentials, AES-256 encrypted.",
    category:    "Communication",
    color:       "#003D8F",
    logo:        "ionos",
    configType:  "personal-credentials",
    aiContext:   true,
    authHint:    "IMAP — host, port, email, password",
    docsUrl:     "https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol",
  },
  {
    id:          "calendar",
    name:        "Calendar (CalDAV / iCal)",
    description: "Personal calendar events via CalDAV or iCal upload. Shows today's schedule in the AI context.",
    category:    "Communication",
    color:       "#003D8F",
    logo:        "ionos",
    configType:  "personal-credentials",
    aiContext:   true,
    authHint:    "CalDAV or iCal file upload",
    docsUrl:     "https://en.wikipedia.org/wiki/CalDAV",
  },

  // ── ITSM ───────────────────────────────────────────────────────────────────

  {
    id:          "servicenow",
    name:        "ServiceNow",
    description: "Incidents, change requests, and CMDB via ServiceNow REST API. AI can query ticket status and escalation data.",
    category:    "ITSM",
    color:       "#81B5A1",
    logo:        "servicenow",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "Basic Auth — service account",
    appUrl:      "https://your-instance.service-now.com",
    docsUrl:     "https://developer.servicenow.com/dev.do",
  },
  {
    id:          "jira",
    name:        "Jira",
    description: "Issues, sprints, and project boards via Atlassian REST API. AI tracks delivery risk and backlog health.",
    category:    "ITSM",
    color:       "#0052CC",
    logo:        "jira",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "API Token — admin email + token",
    appUrl:      "https://servicesphere-ug.atlassian.net",
    docsUrl:     "https://developer.atlassian.com/cloud/jira/platform/rest/",
  },

  // ── Cloud & DevOps ─────────────────────────────────────────────────────────

  {
    id:          "aws",
    name:        "Amazon Web Services",
    description: "Cost explorer, resource inventory, and CloudWatch metrics via AWS SDK. AI surfaces spend anomalies and capacity alerts.",
    category:    "Cloud & DevOps",
    color:       "#FF9900",
    logo:        "amazonaws",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "IAM — Access Key ID + Secret Access Key",
    docsUrl:     "https://docs.aws.amazon.com/",
  },
  {
    id:          "azure-cloud",
    name:        "Microsoft Azure",
    description: "Resource groups, cost management, and Azure Monitor via ARM API. Uses the existing Azure AD session.",
    category:    "Cloud & DevOps",
    color:       "#0078D4",
    logo:        "microsoftazure",
    configType:  "always-on",
    aiContext:   true,
    scopes:      ["https://management.azure.com/user_impersonation"],
    docsUrl:     "https://learn.microsoft.com/en-us/azure/developer/",
  },
  {
    id:          "gcp",
    name:        "Google Cloud",
    description: "BigQuery, GCS, and Cloud Monitoring data via GCP REST APIs. Requires a service account key.",
    category:    "Cloud & DevOps",
    color:       "#4285F4",
    logo:        "googlecloud",
    configType:  "shared-org-api",
    aiContext:   true,
    authHint:    "Service Account — JSON key file (base64)",
    docsUrl:     "https://cloud.google.com/docs",
  },

  // ── Identity ───────────────────────────────────────────────────────────────

  {
    id:          "azure-ad",
    name:        "Azure Active Directory",
    description: "User directory, groups, and role assignments. The identity backbone of Enterprise Hub — always active.",
    category:    "Identity",
    color:       "#0078D4",
    logo:        "microsoftazure",
    configType:  "always-on",
    aiContext:   false,
    scopes:      ["User.Read", "Directory.Read.All"],
    docsUrl:     "https://learn.microsoft.com/en-us/azure/active-directory/",
  },

  // ── Productivity (App links) ───────────────────────────────────────────────

  {
    id:          "ionos-mail",
    name:        "IONOS Mail & Calendar",
    description: "IONOS Webmail and Calendar — opens in a new tab.",
    category:    "Productivity",
    color:       "#003D8F",
    logo:        "ionos",
    configType:  "app-link",
    aiContext:   false,
    appUrl:      "https://email.ionos.de/appsuite/#!!&app=io.ox/mail&folder=default0/INBOX",
  },
  {
    id:          "adobe-sign",
    name:        "Adobe Sign",
    description: "E-signature and document workflows — opens Adobe Sign in a new tab.",
    category:    "Productivity",
    color:       "#FF0000",
    logo:        "adobeacrobatreader",
    configType:  "app-link",
    aiContext:   false,
    appUrl:      "https://secure.adobesign.com",
  },
  {
    id:          "power-bi",
    name:        "Power BI",
    description: "Microsoft Power BI dashboards — opens in a new tab.",
    category:    "Productivity",
    color:       "#F2C811",
    logo:        "powerbi",
    configType:  "app-link",
    aiContext:   false,
    appUrl:      "https://app.powerbi.com",
  },
];

/** Full category order for display */
export const CATEGORY_ORDER: IntegrationDef["category"][] = [
  "AI Data Sources",
  "ERP",
  "CRM",
  "Marketing",
  "Communication",
  "ITSM",
  "Cloud & DevOps",
  "Identity",
  "Productivity",
];

export function getIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}
