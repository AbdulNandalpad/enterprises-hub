# EnterpriseHub v2 — Claude Instructions

## Current repo state (IMPORTANT)

This repo was deliberately stripped to a **marketing-only shell** in August 2026 for a
from-scratch product rebuild. What exists right now:

- `index.html` — the marketing landing page, served at `/` by `src/app/route.ts`
- `src/app/route.ts` — root route handler (reads `index.html`, no-cache headers, tenant-domain redirect guard)
- `src/app/icon.tsx` — favicon
- `public/reports/` + `reports/` — screenshots referenced by the marketing page (both paths kept: Vercel serves from `public/`, the root copy + `CNAME` cover the legacy GitHub Pages path)

Everything else (dashboard, admin panel, auth, connectors, AI routes — ~180 files) was
removed on purpose. **Do not try to "restore" missing pages or treat them as bugs.**

### v1 recovery
Full v1 lives in git history. Local tags `v1-archive` / `v1-main-archive` mark it; the
commits are `39d61dc` (feature-branch tip: app + redesigned marketing) and `70b715a`
(main tip). Never force-push over this history.

---

## Product definition (v2)

**EnterpriseHub is an AI analyst for enterprise systems with compliance built in.**
You ask a question in plain language — it queries your live systems (SAP and Salesforce
first), joins the results, and answers with citations. Every query is written to an
audit trail: who asked, what was asked, which systems were touched, what was answered.
Mid-market buys the speed; enterprise buys the governance (EU AI Act readiness).

Positioning decisions already made:
- **Lead value:** AI analyst, with compliance as the enterprise closer — not a widget
  dashboard, not an intranet, not 35 shallow connectors.
- **Depth over breadth:** SAP + Salesforce only until the core query loop is proven.
  Real sandbox systems exist for both and are the proof vehicle.
- **The demo moment:** one cross-system query (e.g. "which open Salesforce opportunities
  belong to customers with overdue SAP invoices?") answered live, with the audit entry
  shown right after.

## v2 build order (agreed)
1. **Query engine** — Azure OpenAI GPT-4o with tool calling over SAP OData + Salesforce
   clients; audit logging on every tool call. This is the product spine.
2. **One-screen app** — a question box with cited answers and query history (not a
   widget grid).
3. **Login + audit view** — Azure AD (MSAL) and the audit trail a CIO can inspect.
4. **Marketing refresh** — new story on the landing page, ideally with a live query demo.

Design comes first: v2 UI is designed properly before build, not evolved from v1.

---

## Security rules (carried forward from v1 — still binding for all new code)

1. Never roll custom auth logic — MSAL for enterprise users; HMAC-signed cookies for any internal access
2. Governed AI only — every AI action must be auditable
3. Secrets/env vars have NO hardcoded fallbacks — fail closed (503/throw) if unset
4. All admin routes require a server-verified session (JWT) — never same-origin checks alone
5. Tenant/customer isolation resolved server-side from the Host header — never from user-writable input
6. All write routes validate bodies with Zod before touching fields
7. No raw DB/system error messages in API responses — generic messages only, details to `console.error`
8. SSRF protection on all URL-accepting endpoints
9. Rate limiting on any endpoint that accepts credentials

## Infrastructure still live
- Vercel hosting, domain `enterprises-hub.de` (deploys from `main`)
- Supabase project (v1 tables still exist; v2 schema TBD)
- Azure AD app registration (client + tenant IDs in Vercel env)
- SAP + Salesforce sandbox systems (the proof-of-concept data sources)
- `hub.servicesphere.de` — secondary domain, role TBD

## Known gaps
- `/impressum` and `/privacy` links in `index.html` point to pages that don't exist
  (German Impressumspflicht — needs real content from the founder)
