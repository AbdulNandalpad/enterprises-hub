# EnterpriseHub v2 — the product

The v2 application: one deployable, six tiers as typed modules
(see `../docs/ARCHITECTURE.md`). The marketing site lives at the repo
root and deploys separately; this directory is its own Vercel project
(root directory: `hub/`).

## Layout

```
src/app            application tier — UI + API routes (the gateway's surface)
src/gateway        session verification, tenant resolution, rate limiting
src/identity       Azure AD sign-in (MSAL confidential client)
src/orchestration  query engine + model-provider abstraction (Phase 3)
src/connectors     connector contract + registry (SAP/Salesforce in Phase 3)
src/data           control-plane access, tenant provisioning, migrations
src/secrets        envelope encryption for per-tenant credentials
src/audit          append-only audit writer (used in the query path)
```

## Run

```bash
npm install
cp .env.example .env.local   # fill in — nothing has fallbacks, missing config fails closed
npm run db:migrate           # control-plane schema (needs DATABASE_URL)
npm run dev                  # http://localhost:3002
```

Docker: `docker build -t enterprises-hub-app .`
