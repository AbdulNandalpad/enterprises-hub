# Multi-Cloud Infrastructure Abstraction — Parked Roadmap

**Status:** Parked — revisit after first customer (Servicesphere) is live and validated.  
**Logged:** 2026-06-01  
**Decision:** Build it on top of a working Azure implementation, not ahead of it.

---

## Strategic intent

Position EnterpriseHub as cloud-agnostic:
- **SSO abstraction** (Phase 1) — unlock non-Microsoft companies (Okta, Google Workspace, SAML 2.0)
- **Backend provider abstraction** (Phase 2) — deploy inside customer's own AWS/GCP account

## Priority order when revisiting

1. **SSO abstraction first** — this is the actual sales unlock for non-Microsoft companies.
   - Generic OIDC/SAML 2.0 layer replacing hardcoded MSAL
   - Adapters: Azure AD (existing), Okta, Google Workspace, generic SAML
   - Single env var: `AUTH_PROVIDER=azuread|okta|google|saml`

2. **Backend provider interfaces second** — once Azure implementation is solid end-to-end.

---

## Backend provider plan (as designed)

### Interfaces — `backend/providers/interfaces.js`

```
LLMProvider       — chat({ messages, tools, tool_choice }) → OpenAI-compatible response
SecretsProvider   — get(key), set(key, value), delete(key)
AuditStoreProvider — append(event), query({ tenant_id, filters, page, limit })
```

### Provider factory — `backend/providers/index.js`
- Read `INFRA_PROVIDER=azure|aws|gcp` (default: azure)
- Export singletons: `llmProvider`, `secretsProvider`, `auditStoreProvider`
- Throw on unknown value at startup

### Azure — `backend/providers/azure/index.js`
- LLM: Azure OpenAI via `openai` SDK with Azure endpoint
- Secrets: `@azure/keyvault-secrets` (SecretClient)
- Audit: `@azure/cosmos` (CosmosClient, container: `ai_audit_events`)

### AWS — `backend/providers/aws/index.js`
- LLM: `@aws-sdk/client-bedrock-runtime` — `claude-3-5-sonnet` via Anthropic on Bedrock
  - Map OpenAI tools array → Bedrock tool spec (non-trivial, ~80 lines)
  - Map Bedrock response → OpenAI shape
- Secrets: `@aws-sdk/client-secrets-manager` (GetSecretValue / CreateSecret / UpdateSecret)
- Audit: `@aws-sdk/client-dynamodb` — table `eh_audit_events`
  - Partition key: `tenant_id`, sort key: `created_at`
  - Append-only; query via QueryCommand + filter expressions

### GCP — `backend/providers/gcp/index.js`
- LLM: `@google-cloud/vertexai` — `claude-3-5-sonnet` via Anthropic on Vertex AI
  - Same OpenAI-compatible mapping as AWS
- Secrets: `@google-cloud/secret-manager` (accessSecretVersion / createSecret + addSecretVersion)
- Audit: `@google-cloud/firestore` — collection `ai_audit_events`
  - Append-only documents; query via where chaining

### Cloud function adapters — `functions/adapters/`
- Core logic in plain async Node.js modules
- Azure adapter: Azure Functions handler shape
- AWS adapter: Lambda handler shape (`export handler`)
- GCP adapter: Cloud Functions HTTP handler shape (`export http`)

### Environment config blocks (`.env.example`)
One clearly-commented block per provider — INFRA_PROVIDER=azure as default.

---

## What stays Azure-only (intentionally)
- PostgreSQL Config DB — already cloud-agnostic
- SSO — separate future scope (see Phase 1 above)

---

## Trigger to start this work
Signed LOI from a customer who runs on AWS or GCP and requires deployment in their cloud,
OR first customer live + validated + second customer pipeline requires non-Microsoft IdP.
