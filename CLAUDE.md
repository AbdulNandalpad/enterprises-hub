# Enterprises Hub — Claude Instructions

---

## What this product is — CANONICAL DEFINITION (all-time reference point)

> **EnterpriseHub is a governed AI intelligence platform that connects 35+ enterprise systems — SAP, Salesforce, Jira, Workday, and more — under a single, unified interface, allowing business users to query live data, generate dynamic reports, and trigger automated workflows using plain natural language, without switching between applications. Built on Azure OpenAI GPT-4o with Azure AD SSO, tenant-isolated encrypted storage, and a full AI audit trail, it is designed from the ground up for EU AI Act compliance — making it one of the few platforms where enterprise AI adoption can be justified not just technically, but legally and ethically. EnterpriseHub is not an intranet, not a BI tool, and not a chatbot bolted onto existing software — it is a new category: an AI-native enterprise intelligence layer that turns fragmented systems into one governed, conversational workspace.**

This paragraph is the authoritative product definition. Use it as the reference point for all positioning, copy, architecture, and scope decisions. If anything elsewhere in this file conflicts with it, **this definition wins** and the other text should be treated as outdated.

Key implications (supersede earlier framing):
- **AI-native, not AI-free** — EnterpriseHub runs governed AI on **Azure OpenAI GPT-4o**. (This replaces the old "No custom AI / Copilot-only" framing.)
- **It does process and store data** — live queries, generated reports, and workflow state, in **tenant-isolated encrypted storage** with a **full AI audit trail**. (This replaces the old "No data processing / never stores business data" framing.)
- **Governed & compliant by design** — built for **EU AI Act** compliance; the audit trail, tenant isolation, and access controls are core product, not add-ons.
- **Role-aware workspace** — admins, managers, and members see different UI and have different API access.
- **Multi-tenant** — each customer company gets their own subdomain (e.g. `acme.enterprises-hub.de`), branded colours, logo, and isolated, encrypted data. The `default` tenant is the public-facing EnterpriseHub demo environment.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth (enterprise users) | Azure AD via MSAL (`@azure/msal-browser` v5, `@azure/msal-react` v5) |
| Auth (demo/superadmin) | HMAC-signed cookies (`eh-demo`, `sa-token`) — server-side only |
| Server-side session | `eh-session` httpOnly JWT cookie (HS256, 8h TTL) via `jose` v6 |
| Input validation | `zod` v4 — on all write API routes |
| DB | Supabase (Postgres) — config, user/role mapping, connector credentials |
| Hosting | Vercel + custom domain `enterprises-hub.de` |
| Rate limiting | In-memory `checkRateLimit()` from `src/lib/api-security.ts` |

---

## Design system

- **Primary font:** IBM Plex Sans (body), IBM Plex Mono (labels/code), Playfair Display (headings)
- **Colors:** `--paper: #F5F1EA` | `--ink: #0A0906` | `--red: #C8341A` | `--blue: #1A3AC8`
- **Style:** Editorial, minimal — no rounded corners on buttons, monospace labels everywhere
- **Themes:** light / dark / system — driven by `ThemeContext`

---

## Project structure

```
src/
  app/                          ← Next.js App Router pages
    api/                        ← All API routes (see table below)
    dashboard/                  ← Main authenticated workspace
      admin/[section]/          ← Tenant admin panel (section = integrations, users, auth, etc.)
      apps/[appId]/             ← Per-app fullscreen view
      integrations/             ← User-level integration toggles
      reports/                  ← AI report builder
      search/                   ← Global search
      settings/                 ← User settings
      tasks/                    ← Task management widget
    login/                      ← Azure AD login page (MSAL)
    internal/                   ← Unified internal login: Demo + Superadmin tabs
    demo/                       ← Redirects → /internal
    superadmin/                 ← Superadmin portal (tenant CRUD)
    superadmin/login/           ← Redirects → /internal?mode=superadmin
    ai-readiness/               ← AI readiness assessment flow
    auth/redirect/              ← MSAL post-login redirect handler

  components/
    admin/                      ← All admin panel sections (see list below)
      ConnectorWizard.tsx       ← "Wrapper → next → next → go" connector setup (launched from AdminIntegrations)
    ai/                         ← AIPanel, FunctionChips
    dashboard/                  ← DashboardGrid, WidgetPicker, WidgetShell, all widget components
    integrations/               ← IntegrationsHub (user-facing connector toggle UI)
    reports/                    ← Report builder flow components
    settings/                   ← Per-section settings panels
    AuthGuard.tsx               ← Wraps all dashboard pages; checks MSAL + demo cookie + issues eh-session
    Topbar.tsx                  ← Fixed header; user menu; theme toggle; logout
    Sidebar.tsx                 ← Left nav
    DashboardShell.tsx          ← Layout wrapper (Topbar + Sidebar + content)

  lib/
    admin-guard.ts              ← assertAdmin() — async; verifies eh-session JWT + role
    azure-auth.ts               ← verifyAzureIdToken() via Azure AD JWKS (jose)
    session.ts                  ← createSessionToken() / verifySessionToken() for eh-session cookie
    api-security.ts             ← checkRateLimit(), blockSsrfTarget(), assertSameOrigin()
    superadmin-auth.ts          ← assertSuperadmin() — checks sa-token HMAC cookie
    supabase/server.ts          ← supabaseAdmin client (service role)
    tenant/
      types.ts                  ← TenantConfig interface
      db.ts                     ← getAllTenantsFromDB, createTenant, updateTenant, deleteTenant, TenantInput
      registry.ts               ← STATIC_TENANTS fallback, getStaticTenantByDomain()
    integrations/
      registry.ts               ← INTEGRATIONS list, CATEGORY_ORDER

  middleware.ts                 ← Route protection, tenant resolution, sa-token / eh-demo checks
```

---

## Authentication & session architecture

### Enterprise users (Azure AD)
1. User hits `/login` → MSAL `loginRedirect()` → Azure AD → `/auth/redirect`
2. `AuthGuard` mounts → sees `isAuthenticated = true` → calls `acquireTokenSilent()` to get the ID token
3. `AuthGuard` POSTs `Authorization: Bearer <idToken>` to `/api/auth/session`
4. Server verifies the token via `verifyAzureIdToken()` (Azure JWKS, `jose`), looks up the user's role in `tenant_users`, signs an `eh-session` HS256 JWT, sets it as an httpOnly cookie (8h)
5. All subsequent admin API calls go through `assertAdmin()` which reads and verifies `eh-session`
6. On logout: `Topbar` calls `DELETE /api/auth/session` (clears cookie), then `instance.logoutRedirect()` → `enterprises-hub.de`

### Demo users
- `/internal` page (Demo tab) → POST `/api/demo/auth` with passcode
- Server HMAC-signs the `eh-demo` cookie — **not forgeable via DevTools**
- `AuthGuard` verifies the cookie server-side via `/api/demo/verify`
- Demo users are **completely blocked** from all `/api/admin/*` routes — `assertAdmin()` checks and rejects `eh-demo` cookies at step 1
- On logout: `Topbar` calls `DELETE /api/demo/auth` (clears cookie) → `enterprises-hub.de`

### Superadmin
- `/internal` page (Superadmin tab, or `?mode=superadmin`) → POST `/api/superadmin/auth` with secret
- Sets `sa-token` HMAC-signed cookie
- `assertSuperadmin()` verifies it on every superadmin route
- Portal at `/superadmin` — full tenant CRUD

---

## API routes reference

### Public / unauthenticated
| Route | Purpose |
|---|---|
| `GET /api/tenant-lookup` | Resolve tenant from Host header |
| `GET /api/tenant` | Tenant config (public branding) |
| `POST /api/early-access` | Marketing email capture |

### Auth
| Route | Purpose |
|---|---|
| `POST /api/auth/session` | Exchange Azure ID token → `eh-session` cookie |
| `DELETE /api/auth/session` | Clear `eh-session` cookie |
| `POST /api/demo/auth` | Issue demo cookie (rate-limited: 10/15 min) |
| `DELETE /api/demo/auth` | Clear demo cookie |
| `GET /api/demo/verify` | Server-side HMAC verify of demo cookie |
| `POST /api/superadmin/auth` | Issue sa-token cookie |

### Admin (assertAdmin — requires eh-session with Admin/Manager role)
| Route | Purpose |
|---|---|
| `GET/POST /api/admin/users` | List / invite users (Zod validated) |
| `PATCH/DELETE /api/admin/users` | Update roles/status / remove user (Zod) |
| `POST /api/admin/users/bulk` | Bulk user operations |
| `GET/POST /api/admin/connectors` | List / register connector configs (Zod) |
| `PATCH/DELETE /api/admin/connectors/[id]` | Toggle active, update extra_config / delete (Zod) |
| `GET/PATCH /api/admin/branding` | Tenant branding config |
| `GET/PATCH /api/admin/ai-config` | AI feature flags |
| `GET/PATCH /api/admin/access-rules` | Role-based access rules |
| `GET/PATCH /api/audit` | AI audit log + human review verdicts |

### Connectors (user-level, same-origin only)
| Route | Purpose |
|---|---|
| `GET/PATCH /api/integrations` | User integration preferences (demo blocked from PATCH) |
| `GET/POST /api/connectors/caldav/config` | CalDAV iCal URL config |
| `POST /api/connectors/caldav/fetch` | Fetch calendar events |
| `POST /api/connectors/caldav/test` | Test CalDAV connection |
| `GET/POST /api/connectors/imap/config` | IMAP config |
| `GET /api/connectors/imap/fetch` | Fetch emails |
| `GET /api/connectors/salesforce/auth` | Salesforce OAuth start |
| `GET /api/connectors/salesforce/callback` | Salesforce OAuth callback |
| `GET /api/connectors/salesforce/data` | Query Salesforce |
| `POST /api/connectors/salesforce/disconnect` | Remove OAuth tokens |
| `GET /api/connectors/salesforce/status` | Check connection status |
| `GET /api/connectors/sap/data` | Query SAP OData |

### AI (same-origin only)
| Route | Purpose |
|---|---|
| `POST /api/ai/chat` | Chat with AI panel |
| `POST /api/ai/agent` | Agentic task runner |
| `POST /api/ai/expert` | Expert assistant (assertAdmin) |
| `POST /api/ai/function` | Execute AI function chips |

### Superadmin (assertSuperadmin)
| Route | Purpose |
|---|---|
| `GET/POST/PATCH/DELETE /api/superadmin/tenants` | Full tenant CRUD (Zod) |
| `GET /api/superadmin/image-proxy` | Logo image proxy |
| `POST /api/superadmin/upload-logo` | Upload tenant logo |

### User
| Route | Purpose |
|---|---|
| `GET /api/user/me` | Current user profile + role |
| `GET/POST /api/user/keys` | API key management |

---

## Admin panel sections

Rendered by `src/app/dashboard/settings/page.tsx` (shared settings + admin router). The wired sections:

| Section | Component | Purpose |
|---|---|---|
| `overview` | `AdminOverview` | Tenant stats dashboard |
| `users` | `AdminRoles` | Invite, manage, and remove users |
| `branding` | `AdminBranding` | Logo, colours, domain |
| `integrations` | `AdminIntegrations` | Connectors — step-by-step: type → configure → connector; launches `ConnectorWizard` |
| `auth` | `AdminAuth` | Identity providers + token settings |
| `audit` | `AdminAudit` | AI audit log + review |
| `governance` | `AdminGovernance` | AI policy + access rules |
| `playbook` | `AdminPlaybook` | Product intelligence / runbook |

`AdminUI.tsx` is the shared admin UI kit (Btn, FieldGroup, TabBar…), not a section. (The old `AdminMarketplace`, `AdminBuilder`, `AdminSDK`, and `AdminConnectors` components were unwired dead code and have been removed.)

**`ConnectorWizard`** — the "wrapper → next → next → go" connector setup (launched when admin clicks a connector card in `AdminIntegrations`). Every connector is a pre-built **wrapper**; the admin only supplies what its onboarding *lane* needs. Three steps: **Review** (what it connects + AI scope) → **Authorize** (adapts by lane: instant / one-click OAuth / paste-key) → **Go live** (test + enable). Onboarding lanes derive from `configType`: `instant` (always-on, app-link), `one-click` (shared-org-oauth, personal-oauth), `paste-key` (shared-org-api, shared-org-mcp, personal-credentials). SAP SAML Bearer / principal propagation lives in the optional "Advanced" block inside the Authorize step. See `docs/CONNECTORS.md` for the client-onboarding guide.

---

## Security rules (MUST follow in all new code)

1. **Never roll custom auth logic** — auth is MSAL for enterprise users; HMAC cookies for demo/superadmin
2. **Governed AI only** — AI runs on **Azure OpenAI GPT-4o** behind tenant isolation, access control, and a full **AI audit trail**; every AI action must be auditable (supersedes the old "no custom AI / Copilot-only" rule — see canonical definition above)
3. **`DEMO_PASSCODE` env var has NO hardcoded fallback** — returns 503 if unset
4. **`COOKIE_ENCRYPTION_KEY` throws in production if not set**
5. **`SESSION_SECRET` is required in production** — `assertAdmin()` enforces session JWT verification when set
6. **`SF_STATE_SECRET` throws in production if not set** — no hardcoded fallback
7. **All `/api/admin/*` routes MUST use `assertAdmin()`** — never `assertSameOrigin()` alone
8. **`assertAdmin()` is async** — always `await assertAdmin(req)` (all 9 caller files updated)
9. **Demo cookie is HMAC-signed** — cannot be forged via DevTools
10. **Demo users are blocked at step 1 of `assertAdmin()`** — they never reach admin logic
11. **Tenant isolation via Host header** — never from a user-writable cookie or body param
12. **All admin write routes have Zod schemas** — no untyped body casts
13. **No raw DB/system error messages in API responses** — always generic messages; internal errors go to `console.error` only
14. **SSRF protection** — `blockSsrfTarget()` on all URL-accepting endpoints
15. **Rate limiting** — `checkRateLimit()` on demo auth, any endpoint that accepts credentials

---

## Required environment variables

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_AZURE_CLIENT_ID` | MSAL | Azure AD app client ID |
| `NEXT_PUBLIC_AZURE_TENANT_ID` | MSAL | `common` for multi-tenant |
| `DEMO_PASSCODE` | `/api/demo/auth` | No fallback — 503 if missing |
| `DEMO_HMAC_SECRET` | HMAC cookie signing | Required |
| `COOKIE_ENCRYPTION_KEY` | AES-256-GCM cookie encryption | Throws in prod if missing |
| `SESSION_SECRET` | `eh-session` JWT signing | Required for role enforcement |
| `SUPERADMIN_SECRET` | `/api/superadmin/auth` | Required |
| `SA_HMAC_SECRET` | sa-token cookie signing | Required |
| `SF_STATE_SECRET` | Salesforce OAuth state | No fallback — throws in prod |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdmin` | Required (server only) |

---

## Pages & routing

| Path | Who | Purpose |
|---|---|---|
| `/` | Public | Not in Next.js — served from `index.html` (GitHub Pages marketing site) |
| `/login` | Public | Azure AD login (MSAL) |
| `/internal` | Internal | Unified login: Demo tab + Superadmin tab |
| `/internal?mode=superadmin` | Internal | Pre-selects Superadmin tab |
| `/demo` | Internal | Redirects → `/internal` |
| `/superadmin/login` | Internal | Redirects → `/internal?mode=superadmin` |
| `/dashboard` | Auth | Main workspace (grid of widgets) |
| `/dashboard/admin/[section]` | Admin | Tenant admin panel |
| `/dashboard/apps/[appId]` | Auth | Fullscreen app embed |
| `/dashboard/integrations` | Auth | User-level connector toggles |
| `/dashboard/reports` | Auth | AI report builder |
| `/dashboard/search` | Auth | Global search |
| `/dashboard/settings` | Auth | User settings |
| `/dashboard/tasks` | Auth | Task management |
| `/superadmin` | Superadmin | Tenant CRUD portal |
| `/ai-readiness` | Public | AI readiness assessment wizard |
| `/auth/redirect` | MSAL | Post-login redirect handler |

---

## Supabase tables

| Table | Purpose |
|---|---|
| `tenants` | Tenant records (slug, domain, plan, branding) |
| `tenant_users` | User-to-tenant mapping with roles and status |
| `connector_configs` | Connector credentials per tenant (client_secret stored, never returned in lists) |
| `integrations` | User integration preferences |

---

## Key patterns to follow

- **Component imports:** always from `src/components/` — never recreate existing components
- **Tenant slug:** always resolved from `Host` header via `getTenantSlug()` — never from body/cookie
- **Error responses:** generic string only — raw errors go to `console.error`, never the response body
- **Zod validation:** all POST/PATCH body parsing must use `schema.safeParse(raw)` before touching fields
- **`assertAdmin` callers:** must be `const err = await assertAdmin(req); if (err) return err;`
- **New connector config:** add to `INTEGRATIONS` registry in `src/lib/integrations/registry.ts`; the wrapper's onboarding lane is derived from its `configType`; setup wizard lives in `ConnectorWizard.tsx`
- **`index.html`** — the marketing landing page — is completely separate from Next.js; do not modify it during app builds

---

## Work split

- **Abdul:** Auth, shell layout, admin panel, security, API routes, tenant infrastructure
- **Colleague:** App tiles, user dashboard widgets, settings page UI
