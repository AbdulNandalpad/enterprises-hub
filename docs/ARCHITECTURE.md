# EnterpriseHub — Architecture

*Source: founder's architecture draft (Aug 2026) + agreed amendments. The six-tier
architecture is the committed logical architecture. Deployment topology follows the
"modular monolith with hard seams" rule below.*

## Logical architecture (committed)

Six tiers, each a module with a hard, typed interface in the codebase:

1. **Client layer** — end users (browser) and platform admin (one central admin login)
2. **Application tier** — unified web app: Q&A chat first; app launcher + report builder later
3. **Secure integration tier** — API gateway/proxy: the single external-facing surface;
   on-behalf-of auth; rate limiting
4. **Orchestration tier** — Q&A engine (NL query → multi-system synthesis via LLM tool
   calling) and, later, the report engine
5. **Connector layer** — pluggable connectors (SAP, Salesforce first); registry
6. **Data tier** — silo model: one database per client + separate control-plane DB

An **admin control plane** sits alongside: tenant admin portal → tenant provisioning
service → control-plane DB (tenant registry, connector config, entitlements).

## Tenancy: silo model (committed, day 1)

- No shared database with a `tenant_id` column. Every client gets its own database.
- **Tier 1 (V1/pilots):** database per tenant on a shared Postgres cluster.
- **Tier 2 (scale):** dedicated instances/namespaces per client for stricter compliance.
- Control plane and provisioning flow identical across both tiers.
- Provisioning is automated end-to-end from the admin portal — never manual DB setup.

### What lives in a tenant DB (read-only V1)
Query history, **audit log (append-only)**, connector configs + encrypted credentials,
users/entitlements, saved report specs. **Never copies of source-system data** — answers
are synthesized from live queries, and "we don't replicate your ERP" is part of the
security story.

## Agreed amendments to the original draft

1. **Tool calling, not RAG.** The Q&A engine queries live systems on-behalf-of the user
   at question time. No replication of enterprise data into a retrieval index. RAG may
   arrive later for document/wiki sources only.
2. **Audit log is per-tenant**, inside each tenant's DB (append-only), not a shared
   store in the orchestration tier. Only anonymous operational metrics go to the
   control plane.
3. **Connector SDK spec is extracted, not designed up-front** — written after SAP and
   Salesforce connectors work against real sandboxes.
4. **Secrets management is a first-class component** — per-tenant connector credentials
   under envelope encryption, keys held outside the tenant DB.
5. **Model provider behind a thin internal interface** — Claude or Azure OpenAI
   swappable (eventually per-tenant); no direct SDK calls from product code.
6. **Identity:** Azure AD (existing app registration) is the OIDC provider for V1.
   A broker (Keycloak/Okta) enters when a customer brings a different IdP.

## Pre-build clarifications (founder Q&A, settled)

1. **Demo tenant is a normal tenant.** Provisioned via the control plane, own database,
   connectors pointed at the SAP + Salesforce sandboxes. No fixtures, no special demo
   code paths. Wiping/re-provisioning it doubles as a deprovisioning test.
2. **One app, many tenants.** All clients share the deployed application; isolation is
   in data (own DB, optional subdomain), resolved server-side from the SSO org claim.
   Dedicated per-client deployments are the Tier-2 option, same code. Proxy/connector
   config is data, not code: entered by the company admin, encrypted in the tenant DB,
   read by the gateway at request time. Control plane knows which connectors exist,
   never the credentials. Platform needs a stable egress IP clients can allowlist;
   an on-prem "connector agent" is a later tier.
3. **"No data store" — the honest version.** We never replicate client systems; answers
   come from live queries. We DO store per tenant (encrypted, own DB): questions,
   answers, audit log, report specs, connector config — and the audit log inherently
   contains data fragments, which is exactly why it is per-tenant with configurable
   retention. Scale strategy is query pushdown (filters/aggregation/limits execute in
   the source system), not caching; any future cache is per-tenant, in their DB,
   TTL-bound, and covered by the same audit story. Public claim: "Your business data
   stays in your systems. EnterpriseHub stores only your questions, answers, and
   configuration — inside your own isolated, encrypted database."

## Day-1 rigor vs. deferred topology (agreed)

**Must be right from day 1** (expensive to retrofit):
- Silo tenancy + automated provisioning
- On-behalf-of identity flowing through every query
- Audit written in the query path, per tenant
- Connector interface shape
- Domain model & typed contracts between tiers
- Model-provider abstraction
- Encrypted per-tenant secrets

**Deployment topology, added later without rework** (discussion deferred; triggers
recorded so scaling is a planned step):
| Component | Trigger to add |
|---|---|
| Kubernetes / Terraform | A signed customer's security review or Tier-2 isolation demand |
| Redis (cache/rate limit) | p95 latency or rate-limit accuracy requires it |
| Grafana / OpenTelemetry stack | More than ~2 tenants in production |
| Split-out orchestration service | Its deploy cadence diverges from the app |
| Identity broker | First non-Azure-AD customer |
| Second language (Python) for orchestration | Retrieval/ML workloads TS can't serve well |

**Rule:** one deployable to start, Docker from day 1, every tier a module whose
interface would survive extraction into a service unchanged.

## Stack (V1)

- **App:** Next.js (React + TypeScript), Tailwind — one deployable containing gateway
  (API routes), orchestration module, connector layer
- **LLM:** Claude API or Azure OpenAI behind the provider interface (tool calling)
- **DB:** PostgreSQL — one DB per tenant + control-plane DB
- **Auth:** Azure AD via OIDC (MSAL), server-verified sessions
- **Hosting:** containerized; Vercel or container host for V1

## Non-functional priorities (from the draft, still binding)

- Security review of the proxy layer + connector auth model before the first external
  connector goes live
- Admin portal covers: tenant provisioning, connector health, usage/cost visibility,
  audit log
- Cost model for AI usage per query (each question fans out to LLM + multiple systems)
- 1–2 pilot tenants, 2 connectors (SAP + Salesforce) validate the silo flow end-to-end
  before onboarding more
