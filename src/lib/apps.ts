export type App = {
  id: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  url: string;
};

export const apps: App[] = [
  { id: "sap-c4c",       name: "SAP C4C",          category: "CRM",           color: "#0070F2", icon: "S",  url: "https://my.crm.cloud.sap" },
  { id: "sap-s4",        name: "SAP S/4",           category: "ERP",           color: "#0070F2", icon: "S",  url: "https://my.s4hana.ondemand.com" },
  { id: "teams",         name: "Microsoft Teams",   category: "Collaboration", color: "#5B5EA6", icon: "T",  url: "https://teams.microsoft.com" },
  { id: "jira",          name: "Jira",              category: "Projects",      color: "#0052CC", icon: "J",  url: "https://your-org.atlassian.net" },
  { id: "salesforce",    name: "Salesforce",        category: "CRM",           color: "#00A1E0", icon: "SF", url: "https://login.salesforce.com" },
  { id: "servicenow",    name: "ServiceNow",        category: "ITSM",          color: "#81B5A1", icon: "SN", url: "https://your-instance.service-now.com" },
  { id: "adobe-sign",    name: "Adobe Sign",        category: "Documents",     color: "#FA0F00", icon: "A",  url: "https://secure.adobesign.com" },
  { id: "power-bi",      name: "Power BI",          category: "Analytics",     color: "#F2C811", icon: "BI", url: "https://app.powerbi.com" },
];

export function getApp(id: string): App | undefined {
  return apps.find((a) => a.id === id);
}
