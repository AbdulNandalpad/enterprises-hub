export type App = {
  id: string;
  name: string;
  category: string;
  color: string;
  logo: string;
  url: string;
};

export const apps: App[] = [
  { id: "sap-c4c",    name: "SAP C4C",         category: "CRM",           color: "#0070C0", logo: "sap",            url: "https://my352500-sso.crm.ondemand.com" },
  { id: "sap-s4",     name: "SAP S/4 HANA",    category: "ERP",           color: "#0070C0", logo: "sap",            url: "https://my.s4hana.ondemand.com" },
  { id: "teams",      name: "Microsoft Teams", category: "Collaboration", color: "#6264A7", logo: "microsoftteams", url: "https://teams.microsoft.com" },
  { id: "jira",       name: "Jira",            category: "Projects",      color: "#0052CC", logo: "jira",           url: "https://your-org.atlassian.net" },
  { id: "salesforce", name: "Salesforce",      category: "CRM",           color: "#00A1E0", logo: "salesforce",     url: "https://login.salesforce.com" },
  { id: "servicenow", name: "ServiceNow",      category: "ITSM",          color: "#81B5A1", logo: "servicenow",     url: "https://your-instance.service-now.com" },
  { id: "adobe-sign", name: "Adobe Sign",      category: "Documents",     color: "#FF0000", logo: "adobeacrobatreader", url: "https://secure.adobesign.com" },
  { id: "power-bi",   name: "Power BI",        category: "Analytics",     color: "#F2C811", logo: "powerbi",        url: "https://app.powerbi.com" },
];

export function getApp(id: string): App | undefined {
  return apps.find((a) => a.id === id);
}
