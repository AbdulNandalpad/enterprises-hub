/**
 * Connector registry — metadata for all available connectors.
 * Used by the Admin > Connector Registry page and the AI context engine.
 *
 * Runtime logic lives in each connector's own hook/client files.
 * This file is import-safe on both server and client (no MSAL, no fetch).
 */

import type { ConnectorMeta } from "./types";

export const CONNECTORS: ConnectorMeta[] = [
  {
    id:          "microsoft-graph",
    name:        "Microsoft 365",
    description: "User profile, calendar events, and emails via Microsoft Graph API. Active for all Azure AD authenticated users.",
    category:    "microsoft",
    docsUrl:     "https://learn.microsoft.com/en-us/graph/overview",
    alwaysActive: true,
  },
  {
    id:          "microsoft-teams",
    name:        "Microsoft Teams",
    description: "Teams membership and group chat list via Microsoft Graph. Requires user consent (Team.ReadBasic.All · Chat.ReadBasic).",
    category:    "microsoft",
    docsUrl:     "https://learn.microsoft.com/en-us/graph/teams-concept-overview",
  },
  {
    id:          "imap-email",
    name:        "IMAP Email",
    description: "Recent inbox emails from any IMAP provider — IONOS, Gmail, Outlook, or custom. Credentials stored in a scoped httpOnly cookie.",
    category:    "other",
    docsUrl:     "https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol",
  },
  {
    id:          "sap-c4c",
    name:        "SAP Sales Cloud",
    description: "Accounts, opportunities, activities and pipeline data via SAP C4C OData API.",
    category:    "crm",
    docsUrl:     "https://help.sap.com/docs/SAP_CLOUD_FOR_CUSTOMER",
  },
  {
    id:          "salesforce",
    name:        "Salesforce",
    description: "Leads, opportunities, contacts and cases via Salesforce REST API.",
    category:    "crm",
    docsUrl:     "https://developer.salesforce.com/docs/apis",
  },
  {
    id:          "servicenow",
    name:        "ServiceNow",
    description: "Incidents, change requests and CMDB via ServiceNow REST API.",
    category:    "itsm",
    docsUrl:     "https://developer.servicenow.com/dev.do",
  },
  {
    id:          "jira",
    name:        "Jira",
    description: "Issues, sprints, and project boards via Atlassian REST API.",
    category:    "project",
    docsUrl:     "https://developer.atlassian.com/cloud/jira/platform/rest/",
  },
  {
    id:          "sharepoint",
    name:        "SharePoint",
    description: "Documents, lists, and company news via SharePoint REST API.",
    category:    "microsoft",
    docsUrl:     "https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service",
  },
];

/** Look up a connector by id */
export function getConnector(id: string): ConnectorMeta | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
