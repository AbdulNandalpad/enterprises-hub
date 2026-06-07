/**
 * EnterpriseHub Product Intelligence Playbook
 *
 * This is the product's "secret sauce" — the architectural knowledge that
 * differentiates EnterpriseHub. It lives in the codebase so it is:
 *   - Version controlled (every change tracked)
 *   - Visible in the Admin → Playbook section
 *   - Injected into the AI expert system prompt (/api/ai/expert)
 *
 * Every sales conversation and every technical discussion should be grounded
 * in this document. Keep it updated as the product evolves.
 */

export interface PlaybookEntry {
  id:       string;
  section:  string;
  title:    string;
  /** Markdown — rendered in admin UI and consumed by AI expert */
  body:     string;
  tags:     string[];
}

// ─── Section 1 — Product Definition ─────────────────────────────────────────

const PRODUCT: PlaybookEntry[] = [
  {
    id: "what-it-is",
    section: "Product",
    title: "What EnterpriseHub Is",
    tags: ["positioning", "sales", "overview"],
    body: `EnterpriseHub is a **cross-system AI orchestration layer**. It sits on top of all enterprise applications and lets ONE AI communicate with ALL applications simultaneously.

It is **not** a unified portal. It is **not** an SSO aggregator. Almost every company already has SSO — users bookmark apps and click to open them. That problem is solved.

The three things EnterpriseHub delivers that nothing else does:

1. **Holistic AI context** — the AI sees SAP, Salesforce, Outlook, Jira, ServiceNow at the same time, not in isolation.
2. **Cross-system answers** — questions that span multiple applications get one coherent answer, not five separate AI responses from five siloed tools.
3. **Dynamic reporting on demand** — connected to all systems simultaneously, it can generate live reports that combine data from any combination of sources, in plain language.`,
  },

  {
    id: "the-problem",
    section: "Product",
    title: "The Problem Being Solved",
    tags: ["positioning", "sales", "market"],
    body: `Every enterprise application is building its own AI:

- **SAP** has Joule
- **Salesforce** has Einstein
- **ServiceNow** has Now Assist
- **Microsoft 365** has Copilot
- **Jira** has Atlassian Intelligence

Each AI is powerful within its own walls. Useless the moment a question crosses systems.

A sales rep asking **"which open SAP deals have no Salesforce opportunity?"** gets silence from both AIs. A manager asking **"which accounts have open support tickets in ServiceNow AND open deals in Salesforce?"** has to manually cross-reference two systems.

The problem is not that enterprise apps lack AI. The problem is that **every AI is siloed inside its own application**. They cannot talk to each other. They cannot answer questions that cross system boundaries.

EnterpriseHub's AI sees all of them. It answers questions that no single system's AI can answer — because no single system has the full picture.`,
  },

  {
    id: "what-it-is-not",
    section: "Product",
    title: "What EnterpriseHub Is Not",
    tags: ["positioning", "sales", "objections"],
    body: `These are common mischaracterisations — correct them immediately in any customer conversation:

**Not an SSO portal**
SSO is solved. Companies have Azure AD, Okta, Google Workspace. EnterpriseHub uses the existing SSO — it doesn't replace it. The "one login" in our tagline refers to the user not needing any additional login beyond what they already use.

**Not a data warehouse**
EnterpriseHub does not copy, store, or sync data from connected systems. Every AI query calls the source systems in real-time. No data lake, no ETL, no sync jobs. Data stays in the system that owns it.

**Not a custom AI model**
EnterpriseHub does not train models on customer data. The AI is a commercially available model (Anthropic Claude, OpenAI GPT, etc.) with live tool access to the customer's connected systems. The intelligence is in the orchestration and the connectors — not a proprietary model.

**Not a replacement for existing apps**
Users still open SAP when they need to do transactional work in SAP. EnterpriseHub is the intelligence layer on top — for queries, analysis, and reporting that span multiple systems. It complements existing tools, it does not replace them.`,
  },
];

// ─── Section 2 — Identity Architecture ───────────────────────────────────────

const IDENTITY: PlaybookEntry[] = [
  {
    id: "identity-overview",
    section: "Identity",
    title: "The Identity Problem in Enterprise Integrations",
    tags: ["technical", "architecture", "security"],
    body: `When an AI queries a connected system on behalf of a user, there are two fundamentally different approaches:

**Service account mode (wrong)**
A shared admin credential is used for all users. The system returns admin-level data. The user sees more than they should (security risk) or the application tries to filter it down (complex, error-prone, never fully accurate). The system's audit log shows "admin" — not the real user.

**User identity mode (correct)**
Every API call is made using the actual user's credentials or identity token. The connected system applies its own authorization rules — territory, org hierarchy, role permissions. The user sees exactly what they would see if they opened the system themselves. The audit log shows the real user.

EnterpriseHub is designed for user identity mode across all connectors. The mechanism differs by connector type, but the principle is the same: the system's own access control is always more accurate, more secure, and more auditable than anything we can replicate at the application layer.`,
  },

  {
    id: "scenario-enterprise-ad",
    section: "Identity",
    title: "Scenario 1 — Enterprise with Azure AD or Okta",
    tags: ["technical", "architecture", "azure-ad", "okta", "saml", "enterprise"],
    body: `**Who this applies to:** Companies with 200+ employees using Microsoft 365 (Azure AD / Entra ID) or Okta as their corporate identity provider. Most enterprise SAP, ServiceNow, and Workday installations federate with the corporate IdP via SAML.

**The mechanism: Principal Propagation via SAML Bearer Assertion**

This is the optimal scenario. The user's Azure AD identity propagates to every connected system — zero additional logins required.

How it works:
1. User logs in via Azure AD (MSAL) — already happening today
2. MSAL silently acquires a SAML 2.0 assertion from Azure AD, targeting the SAP enterprise app as audience
3. EnterpriseHub server exchanges the SAML assertion for a SAP OAuth access token (SAML Bearer Assertion Grant: \`urn:ietf:params:oauth:grant-type:saml2-bearer\`)
4. SAP validates the assertion against Azure AD's signing certificate
5. SAP maps the Azure AD UPN (email) to the internal SAP user ID
6. A SAP access token is issued for that specific user
7. All OData API calls are made with this token — SAP applies the user's territory, org hierarchy, and role permissions

The user experience: they ask a question, the AI queries SAP. SAP returns exactly what they would see if they opened SAP themselves. No extra login. No prompt.

This same pattern applies to ServiceNow, Workday, and any enterprise system that supports SAML Bearer Assertion. Okta works identically to Azure AD — it is also a SAML 2.0 compliant IdP.

**Admin prerequisites (one-time setup):**
- EnterpriseHub registered as an OAuth client in SAP C4C
- Azure AD (or Okta) configured as the SAML assertion issuer trusted by SAP
- The UPN claim in the SAML assertion must map to a valid SAP user ID (usually already configured for web SSO)`,
  },

  {
    id: "scenario-oauth-saas",
    section: "Identity",
    title: "Scenario 2 — Modern SaaS Tools (Per-User OAuth)",
    tags: ["technical", "architecture", "oauth", "salesforce", "jira", "slack"],
    body: `**Who this applies to:** Any company using modern SaaS tools — regardless of whether they have an enterprise IdP. This covers most of the tools companies use daily.

**The mechanism: OAuth 2.0 Authorization Code per user**

Most modern SaaS platforms have OAuth 2.0 built in. No IdP required. Each user connects their own account once.

How it works:
1. User clicks "Connect" for a tool (e.g. Salesforce) in EnterpriseHub settings
2. Standard OAuth Authorization Code flow — user is redirected to Salesforce login, authorizes EnterpriseHub
3. Refresh token stored securely in \`connector_tokens\` table per user, per connector
4. Every AI call uses that user's access token — refreshed silently as needed
5. Salesforce (or Jira, Slack, etc.) enforces its own sharing rules and permissions natively

**Connectors that use per-user OAuth:**
- Salesforce ✅ (already built)
- Microsoft 365 / Graph ✅ (MSAL, already built)
- Atlassian Jira / Confluence
- Slack
- Google Workspace
- HubSpot CRM
- GitHub
- QuickBooks
- Notion
- Zendesk

This approach works for a 10-person startup and a 10,000-person enterprise identically. No IdP, no SAML configuration, no enterprise prerequisites. The tool's own access control handles user context automatically.`,
  },

  {
    id: "scenario-no-idp",
    section: "Identity",
    title: "Scenario 3 — Small Business (No IdP)",
    tags: ["technical", "architecture", "small-business", "google", "no-sso"],
    body: `**Who this applies to:** Companies of 10–100 people using Gmail + Salesforce + Slack + QuickBooks. No dedicated IdP. Users have individual accounts on each SaaS tool.

**The approach: EnterpriseHub as the identity hub**

Today, EnterpriseHub requires Azure AD login (MSAL). This excludes small companies. To serve this segment, the auth layer needs to support:
- "Continue with Google" (Google OAuth)
- "Continue with Microsoft" (Microsoft personal or M365 Basic account)
- Email + password + MFA fallback

Once the user is logged in to EnterpriseHub, each tool is connected via that tool's own OAuth (Scenario 2 above). The user connects Salesforce once, Jira once, Slack once — each connection stores their own token.

**Why the value proposition is stronger for small companies:**
A small company has never had cross-system AI. They don't have a data team building reports. They don't have a BI tool. When a founder asks "show me all open deals in Salesforce where the contact hasn't replied to any of my last 5 emails" — no tool they have can answer that today. EnterpriseHub can.

They are not replacing an existing workflow. They are getting something entirely new.`,
  },

  {
    id: "scenario-legacy",
    section: "Identity",
    title: "Scenario 4 — Legacy and On-Premise Systems",
    tags: ["technical", "architecture", "legacy", "service-account", "on-premise"],
    body: `**Who this applies to:** Companies running old SAP ECC, on-premise ERP installations, custom internal tools built before modern auth standards.

**The approach: Service account with explicit governance**

Some systems genuinely have no OAuth and no SAML support. For these:
- A service account (admin credentials) is stored in \`connector_configs\`
- EnterpriseHub enforces data scoping via \`connector_access_rules\` — admin, manager, member roles each get a configured scope (all / team / own / none)
- The admin UI clearly labels these connectors: **"Shared access mode"** — so users understand the limitation

**This is the fallback, not the default.** Wherever a system supports OAuth or SAML, use it. Service account mode is only for genuine legacy situations.

**Important to communicate to customers:** Even in service account mode, the AI only queries what the connected role can see, and every query is logged in the audit trail. It is not "all data to all users" — it is governed access with the application enforcing the scoping rules.`,
  },
];

// ─── Section 3 — Connector Architecture ──────────────────────────────────────

const CONNECTORS: PlaybookEntry[] = [
  {
    id: "connector-auth-matrix",
    section: "Connectors",
    title: "Connector Authentication Matrix",
    tags: ["technical", "connectors", "auth", "reference"],
    body: `Every connector in EnterpriseHub uses one of three authentication mechanisms. The correct mechanism depends on what the system supports.

**Tier 1 — Principal Propagation (enterprise IdP required)**
System trusts the corporate IdP (Azure AD / Okta). User's identity flows through silently.
| System | Mechanism |
|---|---|
| SAP C4C / Sales Cloud | SAML Bearer Assertion Grant |
| SAP S/4HANA Cloud | SAP BTP Principal Propagation |
| ServiceNow | OAuth SAML Bearer |
| Workday | OAuth SAML Bearer |

**Tier 2 — Per-user OAuth (no IdP required)**
User authorizes once, token stored per user.
| System | Status |
|---|---|
| Salesforce | ✅ Built |
| Microsoft 365 / Graph | ✅ Built (MSAL) |
| Atlassian Jira | Planned |
| Slack | Planned |
| Google Workspace | Planned |
| HubSpot | Planned |
| GitHub | Planned |
| QuickBooks | Planned |

**Tier 3 — Service account (legacy fallback)**
Shared credential, application-level scoping.
| System | Notes |
|---|---|
| SAP ECC (on-premise) | Basic auth |
| Custom on-prem CRM | API key or basic auth |
| Any legacy system without OAuth | Admin registers credentials |`,
  },

  {
    id: "odata-and-metadata",
    section: "Connectors",
    title: "OData, Schema, and How the AI Knows What to Query",
    tags: ["technical", "odata", "sap", "schema"],
    body: `**OData vs MCP — why we don't need MCP**

MCP (Model Context Protocol) is a standardisation layer for AI tool definitions. We do not use it and do not need it. EnterpriseHub has its own \`ConnectorTool\` interface that achieves the same thing — name, description, JSON Schema parameters, execute function. Adding MCP would add infrastructure complexity (separate MCP servers to deploy) without adding capability.

**How the AI knows which fields to query**

The AI never writes OData queries directly. It speaks in semantic parameters:
- \`{ salesPhase: "Negotiation", accountName: "Acme" }\`
- The tool translates: \`SalesPhaseName eq 'Negotiation' and substringof('Acme', ProspectPartyName)\`

The AI knows what parameters are available because they are documented in the tool's \`description\` and \`parameters\` schema. This schema is hand-curated at development time by reading the SAP OData \`\$metadata\` endpoint (which exposes the full entity model), extracting the relevant fields, and encoding them as tool parameters.

**The OData \$metadata endpoint**
SAP OData exposes its full schema at:
\`GET /sap/c4c/odata/v1/c4codata/\$metadata\`

This is the source of truth for all entities, properties, and types. We query it when adding new connector capabilities — not at runtime. The AI gets a curated, pre-digested subset, not the raw metadata document.

**Filter parameters (planned)**
Current tools support \`limit\` only. The next iteration adds semantic filter params to all tools:
- \`sap_opportunities\`: salesPhase, accountName, minProbability, openOnly, dateRange
- \`sf_opportunities\`: stage, accountName, minAmount, closingThisMonth
- \`graph_emails_recent\`: fromAddress, subject, unreadOnly, daysBack`,
  },
];

// ─── Section 4 — AI Orchestration ────────────────────────────────────────────

const AI_ARCH: PlaybookEntry[] = [
  {
    id: "orchestration-loop",
    section: "AI Architecture",
    title: "How the Cross-System AI Orchestration Works",
    tags: ["technical", "ai", "architecture", "tool-use"],
    body: `The AI agent uses **tool_use** (Anthropic's structured function calling). Each connected system exposes tools with descriptions. The AI decides which tools to call based on the user's question.

**The orchestration loop (max 5 rounds):**

1. User sends a message to the AI panel
2. Server loads all active connector tools for this tenant
3. Tool definitions (name, description, parameter schema) are sent to the AI
4. AI responds with \`tool_use\` blocks — specifying which tools to call and with what parameters
5. Server executes all requested tools **in parallel** (Promise.all)
6. Results returned to the AI as \`tool_result\` blocks
7. AI synthesises a single answer from live data across all systems
8. Response includes source attribution — which systems were actually queried

**Parallel execution is the key**
When a user asks a cross-system question, the AI calls tools from multiple systems in a single round. SAP and Salesforce queries run in parallel — not sequentially. The total latency is the slowest single connector, not the sum of all connectors.

**Graceful degradation**
If one connector fails (network error, expired token, maintenance), the other connectors still return data. The AI acknowledges the failure and answers from what it has. A broken SAP connection does not kill the whole response.

**Source attribution**
Every tool result is tagged with its source system. The AI is instructed to cite sources. The UI displays source chips below each response (e.g. "SAP Sales Cloud · Salesforce").`,
  },

  {
    id: "user-data-context",
    section: "AI Architecture",
    title: "User Data Context — What Data the AI Can See",
    tags: ["technical", "security", "data-governance", "ai"],
    body: `The AI only ever sees data that the authenticated user is authorised to see. This is enforced at multiple layers:

**Layer 1 — System-level (strongest)**
When using per-user OAuth or principal propagation, the connected system's own access control applies. If a Salesforce user can only see their own territory's opportunities, the OAuth token only returns those opportunities. EnterpriseHub cannot see more than the user themselves can see.

**Layer 2 — Governance rules (additional control)**
\`connector_access_rules\` in Supabase allows admins to further restrict what the AI can access per role:
- \`all\` — AI can query all data the token permits
- \`team\` — AI scopes queries to the user's team (self + direct reports)
- \`own\` — AI scopes queries to the user's own records only
- \`none\` — AI cannot access this connector for users with this role

**Layer 3 — Service account fallback**
For legacy connectors using a service account, governance rules are the primary control. The admin explicitly configures what each role can see.

**No data stored in EnterpriseHub**
The AI queries systems in real-time. Results are used to formulate the response and then discarded. EnterpriseHub does not cache, index, or store data from connected systems. Every query is fresh.`,
  },
];

// ─── Section 5 — Sales Conversations ─────────────────────────────────────────

const SALES: PlaybookEntry[] = [
  {
    id: "key-positioning",
    section: "Sales",
    title: "Key Positioning Statement",
    tags: ["sales", "positioning", "pitch"],
    body: `**The one sentence that must land in every customer conversation:**

> "EnterpriseHub is not an SSO portal. Your users already have SSO. EnterpriseHub is the AI layer that sits above all your enterprise applications and answers questions that span multiple systems simultaneously — something no single system's own AI can do."

**The contrast that makes it clear:**

Without EnterpriseHub:
- Sales rep asks SAP Joule: "Which of my open deals closed last quarter in Salesforce?" → Joule doesn't know Salesforce
- Sales rep asks Einstein: "Which SAP accounts have upcoming activities this week?" → Einstein doesn't know SAP
- User has to log in to both systems and manually correlate data

With EnterpriseHub:
- User asks one AI: "Which accounts have an open SAP opportunity AND an unresolved Salesforce case?"
- AI queries both simultaneously, returns a single unified answer in seconds

**The demo that always works:**
Ask the customer: "What question do your people ask that requires them to look at more than one system?"

Whatever they say — that's the demo. Build it live in front of them.`,
  },

  {
    id: "objections",
    section: "Sales",
    title: "Handling Common Customer Objections",
    tags: ["sales", "objections"],
    body: `**"We already have SSO, our users can already access all their apps."**
Correct — and EnterpriseHub leverages that SSO, it doesn't replace it. What SSO doesn't give you is an AI that can answer questions that cross those app boundaries. Your users still switch between SAP and Salesforce to correlate data manually. We eliminate that.

**"SAP Joule (or Einstein, or Copilot) already does AI for us."**
Joule is excellent inside SAP. Einstein is excellent inside Salesforce. But ask Joule a Salesforce question — it doesn't know. Ask Einstein a SAP question — it doesn't know. EnterpriseHub is the layer that connects them. The value is specifically in the cross-system intelligence.

**"What about data security — all our data flowing through a third party?"**
No data flows through us or is stored by us. The AI calls each system in real-time using the user's own credentials. SAP, Salesforce, and every other system apply their own authorization rules. We never see more data than the user themselves can see. Query results are used to generate the response and immediately discarded.

**"Our SAP uses SSO with Azure AD — users don't have separate SAP passwords."**
This is the ideal setup for EnterpriseHub. We use Principal Propagation — the user's Azure AD identity is silently exchanged for a SAP API token. No second login, no password prompts. The user logs in once with their corporate Azure AD account and EnterpriseHub queries SAP as them, with their exact SAP permissions.

**"We're a small company, we don't have Azure AD or enterprise SSO."**
No problem. For modern SaaS tools — Salesforce, Jira, Slack, HubSpot — they all support OAuth 2.0 natively. Each user connects their tools once with a click. No enterprise IdP required. The cross-system AI value is identical regardless of company size.

**"How is this different from just asking ChatGPT?"**
ChatGPT doesn't have access to your SAP data, your Salesforce data, or your calendar. It can only answer based on what you paste into it. EnterpriseHub's AI has live, real-time access to your actual enterprise data — with your permissions — and can act across multiple systems simultaneously.

**"What does implementation look like?"**
For modern SaaS connectors (Salesforce, Jira, Slack): users connect their own accounts in under a minute each. No IT involvement. For enterprise connectors (SAP with Azure AD SSO): a one-time admin configuration to register EnterpriseHub as an OAuth client in SAP and confirm the Azure AD trust. Typically 2–4 hours of IT time, done once for the entire organisation.`,
  },

  {
    id: "customer-discovery",
    section: "Sales",
    title: "Discovery Questions That Open the Conversation",
    tags: ["sales", "discovery"],
    body: `These questions surface the pain that EnterpriseHub solves. Let the customer describe their own problem before positioning.

**Cross-system questions:**
- "When your team wants to know which customers have open deals AND open support tickets, how do they find that today?"
- "If I asked you right now which of your top 10 SAP accounts have had no Salesforce activity in the last 30 days, how long would it take to answer that?"
- "How many systems does a typical sales manager need to open to prepare for a customer review meeting?"

**AI and current tools:**
- "Are you using the AI features in SAP / Salesforce / Microsoft 365? What can't they answer?"
- "What questions do your people ask that your current AI tools can't answer?"

**Reporting:**
- "Who builds your cross-system reports today? How long does that take?"
- "Do you have a business intelligence team or does reporting fall to the people who manage each system?"

**Identity and setup:**
- "Are your enterprise apps (SAP, ServiceNow, etc.) connected to Azure AD for SSO?"
  - Yes → "Perfect, that means we can do principal propagation — no extra logins for anyone."
  - No → "What do users use to log in? We support per-user OAuth for most modern SaaS tools."`,
  },
];

// ─── Section 6 — Technical Setup Guides ──────────────────────────────────────

const SETUP: PlaybookEntry[] = [
  {
    id: "setup-sap-principal-propagation",
    section: "Setup",
    title: "SAP C4C — Principal Propagation Setup (Azure AD)",
    tags: ["technical", "setup", "sap", "azure-ad"],
    body: `**Prerequisites:**
- SAP C4C instance with Azure AD configured as the SAML Identity Provider (this is already in place if users access SAP via SSO)
- Azure AD Global Admin access (one-time setup)
- SAP C4C Administrator access

**Azure AD side:**
1. In Azure AD, locate the SAP C4C Enterprise Application (already exists for web SSO)
2. Note the Application ID URI — this is the audience for SAML assertions
3. Enable "Allow SAML assertions to be issued for this application" on the enterprise app
4. Register EnterpriseHub as an app that can request SAML assertions for this resource

**SAP C4C side:**
1. Go to Administrator → OAuth 2.0 Client Management
2. Create a new OAuth 2.0 client for EnterpriseHub
3. Set Grant Type to "SAML 2.0 Bearer Assertion"
4. Configure the issuer as your Azure AD tenant ID
5. Map the UPN claim (\`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn\`) to SAP User ID

**EnterpriseHub connector_configs:**
\`\`\`
connector_type: sap-c4c
instance_url:   https://[tenant].crm.ondemand.com
client_id:      [OAuth client ID from SAP]
client_secret:  [OAuth client secret from SAP]
extra_config:   { auth_mode: "saml-bearer", saml_audience: "[SAP app ID URI from Azure AD]" }
\`\`\`

**Testing:**
After setup, a user should be able to trigger an SAP query from the AI panel. Check the SAP audit log — it should show the individual user's email, not a service account name.`,
  },

  {
    id: "setup-salesforce",
    section: "Setup",
    title: "Salesforce — Per-User OAuth Setup",
    tags: ["technical", "setup", "salesforce", "oauth"],
    body: `**Prerequisites:**
- Salesforce admin access to create a Connected App
- Users will each authorize EnterpriseHub once (typically <1 minute per user)

**Salesforce side:**
1. Setup → App Manager → New Connected App
2. Enable OAuth Settings
3. Callback URL: \`https://[your-domain]/api/connectors/salesforce/callback\`
4. OAuth Scopes: \`api\`, \`refresh_token\`, \`offline_access\`
5. Note the Consumer Key (client_id) and Consumer Secret (client_secret)

**EnterpriseHub admin connector_configs:**
\`\`\`
connector_type: salesforce
instance_url:   https://[company].salesforce.com  (or login.salesforce.com)
client_id:      [Consumer Key]
client_secret:  [Consumer Secret]
\`\`\`

**User flow:**
Each user goes to Settings → Connectors → Salesforce → Connect. Redirected to Salesforce, authorises the app, redirected back. Done. Their token is stored and used for all future AI queries.

**Data scope:**
In Admin → AI Governance, configure \`connector_access_rules\` for Salesforce:
- Admin role → \`all\` (sees all records the token permits)
- Manager role → \`team\` (own records + direct reports)
- Member role → \`own\` (own records only)`,
  },
];

// ─── Master export ────────────────────────────────────────────────────────────

export const PLAYBOOK: PlaybookEntry[] = [
  ...PRODUCT,
  ...IDENTITY,
  ...CONNECTORS,
  ...AI_ARCH,
  ...SALES,
  ...SETUP,
];

/** All unique sections in display order */
export const PLAYBOOK_SECTIONS = [
  "Product",
  "Identity",
  "Connectors",
  "AI Architecture",
  "Sales",
  "Setup",
] as const;

export type PlaybookSection = (typeof PLAYBOOK_SECTIONS)[number];

/** All entries for a given section */
export function entriesForSection(section: PlaybookSection): PlaybookEntry[] {
  return PLAYBOOK.filter((e) => e.section === section);
}

/**
 * Build the full playbook as a plain-text context block for the AI expert.
 * Structured so Claude can answer any product, technical, or sales question.
 */
export function buildPlaybookContext(): string {
  const lines: string[] = [
    "# EnterpriseHub Product Intelligence Playbook",
    "",
    "This is the authoritative product knowledge for EnterpriseHub. Use it to answer",
    "questions about the product, integration architecture, identity, connectors,",
    "and how to position EnterpriseHub in customer conversations.",
    "",
  ];

  for (const section of PLAYBOOK_SECTIONS) {
    const entries = entriesForSection(section);
    if (entries.length === 0) continue;

    lines.push(`## ${section}`);
    lines.push("");

    for (const entry of entries) {
      lines.push(`### ${entry.title}`);
      lines.push("");
      lines.push(entry.body);
      lines.push("");
    }
  }

  return lines.join("\n");
}
