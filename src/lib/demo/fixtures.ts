/**
 * Demo fixtures — Servicesphere GmbH
 *
 * A fictional German B2B services company used for all sales demos.
 * All data is fake and designed to illustrate EnterpriseHub's value:
 * SAP + Salesforce + ServiceNow + Teams — unified in one workspace.
 *
 * Import only from client or server-side demo interceptors.
 * Never import from production code paths.
 */

import type { IntegrationState } from "@/lib/integrations/types";

// ─── Tenant ───────────────────────────────────────────────────────────────────

export const DEMO_COMPANY = "Servicesphere";
export const DEMO_DOMAIN  = "servicesphere.de";

// ─── Users ────────────────────────────────────────────────────────────────────

export const DEMO_USERS = [
  {
    id:         "u-demo-1",
    email:      "anna.mueller@servicesphere.de",
    name:       "Anna Müller",
    roles:      ["Admin"],
    status:     "active",
    invited_at: "2025-01-10T09:00:00Z",
  },
  {
    id:         "u-demo-2",
    email:      "tobias.berg@servicesphere.de",
    name:       "Tobias Berg",
    roles:      ["Manager"],
    status:     "active",
    invited_at: "2025-01-10T09:05:00Z",
  },
  {
    id:         "u-demo-3",
    email:      "lena.koch@servicesphere.de",
    name:       "Lena Koch",
    roles:      ["Employee"],
    status:     "active",
    invited_at: "2025-01-12T14:00:00Z",
  },
  {
    id:         "u-demo-4",
    email:      "marco.fischer@servicesphere.de",
    name:       "Marco Fischer",
    roles:      ["Employee"],
    status:     "pending",
    invited_at: "2025-03-01T10:00:00Z",
  },
];

// ─── Integrations ─────────────────────────────────────────────────────────────
// 9 systems shown as live in the demo. Returned by /api/integrations when the
// eh-demo cookie is present.

export const DEMO_INTEGRATION_STATES: IntegrationState[] = [
  // Always-on (Azure AD)
  { integration_id: "microsoft-365", enabled: true,  show_in_nav: false, status: "always_on" },
  { integration_id: "sharepoint",    enabled: true,  show_in_nav: false, status: "always_on" },
  { integration_id: "azure-ad",      enabled: true,  show_in_nav: false, status: "always_on" },
  { integration_id: "azure-cloud",   enabled: true,  show_in_nav: false, status: "always_on" },

  // Connected org-level systems (the impressive ones in the demo)
  {
    integration_id: "sap-s4hana",
    enabled:        true,
    show_in_nav:    true,
    status:         "connected",
    instance_url:   "https://s4hana.servicesphere.de",
    last_tested_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 min ago
  },
  {
    integration_id: "salesforce-crm",
    enabled:        true,
    show_in_nav:    true,
    status:         "connected",
    instance_url:   "https://servicesphere.my.salesforce.com",
    last_tested_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    integration_id: "servicenow",
    enabled:        true,
    show_in_nav:    true,
    status:         "connected",
    instance_url:   "https://servicesphere.service-now.com",
    last_tested_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    integration_id: "jira",
    enabled:        true,
    show_in_nav:    false,
    status:         "connected",
    instance_url:   "https://servicesphere-ug.atlassian.net",
    last_tested_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    integration_id: "microsoft-teams",
    enabled:        true,
    show_in_nav:    false,
    status:         "connected",
  },

  // Productivity app-links
  { integration_id: "ionos-mail", enabled: true, show_in_nav: true,  status: "not_configured" },
  { integration_id: "power-bi",   enabled: true, show_in_nav: false, status: "not_configured" },
  { integration_id: "adobe-sign", enabled: true, show_in_nav: false, status: "not_configured" },
];

// ─── SAP widget ───────────────────────────────────────────────────────────────

export const DEMO_SAP = {
  stats: {
    totalOpportunities: 14,
    openOpportunities:  9,
    totalAccounts:      31,
  },
  opportunities: [
    { ObjectID: "o1", Name: "Digital Transformation Phase 2", SalesPhaseName: "Proposal",      ExpectedValue: "420000", CloseDate: "2025-09-30", AccountName: "Brauer & Partner GmbH" },
    { ObjectID: "o2", Name: "SAP BTP Migration",              SalesPhaseName: "Negotiation",   ExpectedValue: "290000", CloseDate: "2025-08-15", AccountName: "Müller Logistik AG" },
    { ObjectID: "o3", Name: "Cloud Infrastructure Audit",     SalesPhaseName: "Qualification", ExpectedValue: "115000", CloseDate: "2025-10-10", AccountName: "Reinhardt Technik" },
    { ObjectID: "o4", Name: "ERP Rollout — 3 Sites",          SalesPhaseName: "Prospecting",   ExpectedValue: "680000", CloseDate: "2025-12-01", AccountName: "Steinberg Industries" },
  ],
  accounts: [
    { ObjectID: "a1", AccountName: "Brauer & Partner GmbH",  IndustryCode: "Manufacturing",    CityName: "München",   CountryCode: "DE" },
    { ObjectID: "a2", AccountName: "Müller Logistik AG",     IndustryCode: "Transportation",   CityName: "Hamburg",   CountryCode: "DE" },
    { ObjectID: "a3", AccountName: "Reinhardt Technik",      IndustryCode: "Engineering",      CityName: "Stuttgart", CountryCode: "DE" },
    { ObjectID: "a4", AccountName: "Steinberg Industries",   IndustryCode: "Manufacturing",    CityName: "Frankfurt", CountryCode: "DE" },
  ],
  activities: [
    { ObjectID: "ac1", Subject: "Q3 Review Call — Brauer & Partner",  CategoryCode: "01", StatusCode: "1", StartDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), AccountName: "Brauer & Partner GmbH" },
    { ObjectID: "ac2", Subject: "Contract Renewal Presentation",      CategoryCode: "03", StatusCode: "1", StartDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), AccountName: "Müller Logistik AG" },
    { ObjectID: "ac3", Subject: "Kick-off Follow-Up Email",           CategoryCode: "02", StatusCode: "2", StartDateTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(), AccountName: "Reinhardt Technik" },
  ],
};

// ─── Salesforce widget ────────────────────────────────────────────────────────

export const DEMO_SALESFORCE = {
  stats: {
    totalOpportunities: 12,
    openOpportunities:  8,
    totalPipeline:      1505000,
    closedWonThisMonth: 2,
  },
  opportunities: [
    { Id: "sf1", Name: "Enterprise Licence Expansion",  StageName: "Proposal/Price Quote", Amount: 380000, CloseDate: "2025-09-20", AccountName: "Krause Digital GmbH",  Probability: 65 },
    { Id: "sf2", Name: "New Account — Vogt & Söhne",    StageName: "Needs Analysis",       Amount: 155000, CloseDate: "2025-10-05", AccountName: "Vogt & Söhne KG",       Probability: 30 },
    { Id: "sf3", Name: "Renewal 2026 — Hoffmann Group", StageName: "Value Proposition",    Amount: 220000, CloseDate: "2025-11-01", AccountName: "Hoffmann Group",         Probability: 50 },
    { Id: "sf4", Name: "Upskilling Programme",          StageName: "Prospecting",          Amount: 88000,  CloseDate: "2025-12-10", AccountName: "Baumann AG",             Probability: 15 },
  ],
  contacts: [
    { Id: "sc1", Name: "Markus Krause",  Title: "Head of IT",          Email: "m.krause@krausedigital.de",    AccountName: "Krause Digital GmbH" },
    { Id: "sc2", Name: "Petra Vogt",     Title: "Procurement Manager", Email: "p.vogt@vogtsoehne.de",         AccountName: "Vogt & Söhne KG" },
    { Id: "sc3", Name: "Stefan Hoffmann",Title: "Managing Director",   Email: "s.hoffmann@hoffmann-group.de", AccountName: "Hoffmann Group" },
  ],
};

// ─── Teams widget ─────────────────────────────────────────────────────────────

export const DEMO_TEAMS = {
  teams: [
    { id: "tm1", displayName: "Sales DACH",    description: "DACH region sales & key accounts" },
    { id: "tm2", displayName: "IT Operations", description: "Infrastructure, cloud, and security" },
    { id: "tm3", displayName: "Project Delta", description: "Q3 digital transformation rollout" },
    { id: "tm4", displayName: "General",       description: null },
  ],
  chats: [
    { id: "ch1", chatType: "oneOnOne" as const, topic: null,                    lastUpdatedDateTime: new Date(Date.now() - 25 * 60000).toISOString() },
    { id: "ch2", chatType: "group"    as const, topic: "Brauer & Partner Deal", lastUpdatedDateTime: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: "ch3", chatType: "meeting"  as const, topic: "SAP BTP Project Sync",  lastUpdatedDateTime: new Date(Date.now() - 3 * 3600000).toISOString() },
  ],
};

// ─── Calendar widget ──────────────────────────────────────────────────────────

const today = new Date();
const dateStr = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const DEMO_CALENDAR = {
  events: [
    {
      id:      "cal1",
      subject: "SAP BTP Project Sync",
      start:   dateStr(9, 30),
      end:     dateStr(10, 0),
      organizer: "tobias.berg@servicesphere.de",
      location: "Teams",
    },
    {
      id:      "cal2",
      subject: "Brauer & Partner — Quarterly Review",
      start:   dateStr(14, 0),
      end:     dateStr(15, 0),
      organizer: "anna.mueller@servicesphere.de",
      location: "Conference Room B2 · München",
    },
    {
      id:      "cal3",
      subject: "1:1 — Lena Koch",
      start:   dateStr(16, 30),
      end:     dateStr(17, 0),
      organizer: "anna.mueller@servicesphere.de",
      location: "Teams",
    },
  ],
};

// ─── Profile widget ───────────────────────────────────────────────────────────

export const DEMO_PROFILE = {
  displayName:      "Anna Müller",
  jobTitle:         "Head of Digital Operations",
  department:       "Operations",
  mail:             "anna.mueller@servicesphere.de",
  officeLocation:   "München HQ — Floor 3",
  businessPhones:   ["+49 89 4400-2810"],
};

// ─── Mail widget ──────────────────────────────────────────────────────────────

// Shape matches GraphMessage from @/lib/connectors/graph/client
export const DEMO_MAIL = [
  {
    id:               "m1",
    subject:          "Re: Brauer & Partner — Contract v3",
    receivedDateTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead:           false,
    from:             { emailAddress: { name: "Markus Brauer", address: "m.brauer@brauerpartner.de" } },
    bodyPreview:      "Anna, the updated terms look good. We can sign by Friday if you confirm the SLA section.",
    webLink:          "https://outlook.office.com/mail/inbox",
  },
  {
    id:               "m2",
    subject:          "ServiceNow alert: INC0041 — Critical",
    receivedDateTime: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    isRead:           false,
    from:             { emailAddress: { name: "ServiceNow", address: "noreply@servicesphere.service-now.com" } },
    bodyPreview:      "Incident INC0041 has been escalated to Priority 1. Assigned to: Marco Fischer.",
    webLink:          "https://outlook.office.com/mail/inbox",
  },
  {
    id:               "m3",
    subject:          "Salesforce: 3 opportunities closing this week",
    receivedDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead:           true,
    from:             { emailAddress: { name: "Salesforce Notifications", address: "notifications@salesforce.com" } },
    bodyPreview:      "Your forecast includes 3 deals closing before Friday totalling €843,000.",
    webLink:          "https://outlook.office.com/mail/inbox",
  },
];

// ─── Reports widget ───────────────────────────────────────────────────────────

export const DEMO_SAVED_REPORTS = [
  {
    id:       "r1",
    title:    "DACH Pipeline × SAP Open Orders",
    subtitle: "Opportunities with no linked ERP order",
    accent:   "#0070F3",
    sources:  ["SAP", "SF"],
    kpis:     ["€1.4M at risk", "6 deals", "Avg 34d open", "3 accounts"],
    date:     "Jun 3, 2025",
  },
  {
    id:       "r2",
    title:    "Q2 Activity Report — Sales DACH",
    subtitle: "Calls, emails, and meetings by rep",
    accent:   "#00A1E0",
    sources:  ["SF", "M365"],
    kpis:     ["142 activities", "38% calls", "12 proposals", "4 deals won"],
    date:     "Jun 1, 2025",
  },
];

// ─── AI Governance (AdminGovernance) ─────────────────────────────────────────
// Shapes match the AuditEvent and AccessRule types in AdminGovernance.tsx

export const DEMO_GOVERNANCE_EVENTS = [
  {
    id:           "g1",
    tenant_id:    "demo",
    agent_run_id: "run-2025-0041",
    agent_name:   "email_to_quote",
    action_type:  "CREATE_QUOTE",
    risk_score:   72,
    eu_ai_act_articles: ["Art. 13", "Art. 14"],
    input_context: {
      raw_input_hash:      "a3f5c8d2e1b49071f3e8c2d4a5b6e7f8",
      extracted_entities:  { customer: "Brauer & Partner GmbH", value: "€420,000", due_date: "30 Sep 2025" },
      model_id:            "claude-3-5-sonnet",
      prompt_version:      "email-to-quote-v2.1",
    },
    model_reasoning: {
      chain_of_thought: "Customer email references Phase 2 project. Matched to SAP opportunity 'Digital Transformation Phase 2' via fuzzy entity match. Explicit value stated in body.",
      confidence:       0.87,
      alternatives:     ["Create activity instead of quote", "Attach to existing open quote QT-2025-0038"],
      rationale:        "Creating new quotation is highest-confidence action given explicit pricing mention and no open quote in negotiation stage.",
    },
    sap_action: {
      object_type:   "Quotation",
      object_id:     "QT-2025-0041",
      operation:     "CREATE",
      fields_before: {},
      fields_after:  { Customer: "Brauer & Partner GmbH", NetAmount: "420000", Currency: "EUR", ValidUntil: "2025-09-30" },
    },
    human_review: null,
    hmac_signature: "3f9a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id:           "g2",
    tenant_id:    "demo",
    agent_run_id: "run-2025-0039",
    agent_name:   "account_360",
    action_type:  "READ_ACCOUNT_SUMMARY",
    risk_score:   18,
    eu_ai_act_articles: ["Art. 13"],
    input_context: {
      raw_input_hash:      "b4c6d8e2f1a3b5c7d9e1f3a5b7c9d1e3",
      extracted_entities:  { account: "Müller Logistik AG", requested_by: "anna.mueller@servicesphere.de" },
      model_id:            "claude-3-5-haiku",
      prompt_version:      "account-360-v1.4",
    },
    model_reasoning: {
      chain_of_thought: "User requested 360° summary for Müller Logistik AG. Read-only aggregation of SAP opportunities, open orders, and Salesforce contact history.",
      confidence:       0.98,
      alternatives:     [],
      rationale:        "Pure read-only summary — no write actions. Low risk.",
    },
    sap_action: {
      object_type:   "Account",
      object_id:     "ACC-0002",
      operation:     "READ_ONLY",
      fields_before: {},
      fields_after:  {},
    },
    human_review: {
      reviewer_id:     "anna.mueller@servicesphere.de",
      verdict:         "approved" as const,
      override_reason: "Routine account briefing — no override needed.",
      reviewed_at:     new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    hmac_signature: "9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id:           "g3",
    tenant_id:    "demo",
    agent_run_id: "run-2025-0035",
    agent_name:   "daily_briefing",
    action_type:  "UPDATE_OPPORTUNITY_STAGE",
    risk_score:   55,
    eu_ai_act_articles: ["Art. 13", "Art. 17"],
    input_context: {
      raw_input_hash:      "c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5",
      extracted_entities:  { opportunity: "SAP BTP Migration", new_stage: "Negotiation", previous_stage: "Proposal" },
      model_id:            "claude-3-5-sonnet",
      prompt_version:      "briefing-stage-update-v1.0",
    },
    model_reasoning: {
      chain_of_thought: "Morning briefing detected two follow-up emails confirming intent. Stage advancement from Proposal → Negotiation inferred from customer language.",
      confidence:       0.74,
      alternatives:     ["Keep at Proposal stage", "Flag for manual review only"],
      rationale:        "Confidence 74% — medium risk. Stage update is reversible. Proceeding with auto-approval.",
    },
    sap_action: {
      object_type:   "Opportunity",
      object_id:     "OPP-0002",
      operation:     "UPDATE",
      fields_before: { SalesPhaseName: "Proposal" },
      fields_after:  { SalesPhaseName: "Negotiation" },
    },
    human_review: {
      reviewer_id:     "tobias.berg@servicesphere.de",
      verdict:         "approved" as const,
      override_reason: "Confirmed — customer called me yesterday to discuss terms.",
      reviewed_at:     new Date(Date.now() - 26 * 3600000).toISOString(),
    },
    hmac_signature: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
  },
];

export const DEMO_ACCESS_RULES = [
  { connector_type: "salesforce",      role: "Admin",   ai_enabled: true,  data_scope: "all"  },
  { connector_type: "salesforce",      role: "Manager", ai_enabled: true,  data_scope: "team" },
  { connector_type: "salesforce",      role: "Member",  ai_enabled: true,  data_scope: "own"  },
  { connector_type: "sap_sales_cloud", role: "Admin",   ai_enabled: true,  data_scope: "all"  },
  { connector_type: "sap_sales_cloud", role: "Manager", ai_enabled: true,  data_scope: "team" },
  { connector_type: "sap_sales_cloud", role: "Member",  ai_enabled: false, data_scope: "own"  },
  { connector_type: "sap_s4hana",      role: "Admin",   ai_enabled: true,  data_scope: "all"  },
  { connector_type: "sap_s4hana",      role: "Manager", ai_enabled: false, data_scope: "own"  },
  { connector_type: "sap_s4hana",      role: "Member",  ai_enabled: false, data_scope: "own"  },
];
