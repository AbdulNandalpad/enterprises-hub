# EnterpriseHub v2 — Build Plan

*Phases are sequential; each has an exit criterion that must be true before the next
starts. Durations assume one founder + Claude working steadily.*

## Phase 0 — Foundations on paper *(days)*

- [x] Vision, architecture, and decisions recorded in the repo (`docs/`)
- [ ] **Draft the 10 killer questions** (≥4 cross-system) against *standard* SAP and
      Salesforce schemas (e.g. sales orders/open items/customers; Opportunity/Account).
      These are the working spec for the query engine, revalidated in Phase 3.

**Security decision (founder, settled):** sandbox credentials are never shared
out-of-band — no throwaway scripts, no credentials in chat or env handoffs. The
founder configures SAP + Salesforce through the product's own connector setup UI,
where credentials are entered once and stored under per-tenant envelope encryption.
Sandbox verification therefore happens in Phase 3, through the product itself.

**Exit:** killer questions drafted and agreed as the working spec.

## Phase 1 — Design *(1–2 weeks)*

- [ ] Core screen: question box → cited answer → audit trail. Including the trust UX:
      per-statement source attribution, confidence signal, "systems disagree" state
- [ ] Query history / saved queries (the seed of reporting)
- [ ] Audit view a CIO can inspect (the enterprise demo closer)
- [ ] Minimal admin: connector setup, users/entitlements
- [ ] Visual identity decision: keep the editorial marketing look or evolve it
- Deliverable: clickable prototype (HTML or Figma), reviewed and signed off

**Exit:** founder would proudly demo the *design* alone.

## Phase 2 — Skeleton *(≈1 week)*

- [ ] New Next.js app, TypeScript, Docker from day 1
- [ ] Six tiers as modules with typed interfaces (per `ARCHITECTURE.md`)
- [ ] Control-plane DB + automated tenant provisioning (Tier-1 silo: DB per tenant)
- [ ] Azure AD OIDC login; server-verified sessions; per-tenant secrets (envelope encryption)
- [ ] Deployed behind the marketing site's domain structure

**Exit:** login works, tenant resolves to its own DB, empty product shell deployed.

## Phase 3 — Query engine (the spine) *(2–3 weeks)*

- [ ] **Connector setup UI first** — real configuration flow (endpoint, auth, test
      connection) storing credentials under per-tenant envelope encryption
- [ ] **Founder configures both sandboxes through that UI** — no out-of-band credential
      sharing, ever
- [ ] SAP connector: read-only OData, on-behalf-of pattern, health check
- [ ] Salesforce connector: read-only, user-context OAuth, health check
- [ ] **Sandbox truth check (through the product):** inventory reachable entities;
      confirm the sandboxes share overlapping customers so cross-system joins return
      real hits — seed matching records if not; adjust killer questions to reality
- [ ] Orchestration: LLM tool-calling loop over both connectors; provider abstraction
- [ ] Citations: every answer statement traceable to system + entity
- [ ] Audit: every query/tool-call/answer written append-only in the query path
- [ ] All 10 killer questions answered correctly against the sandboxes

**Exit:** the flagship cross-system query answered live, audit entry visible. This is
the moment the product exists.

## Phase 4 — Product surface *(≈2 weeks)*

- [ ] Build the Phase-1 design for real: question box, cited answers, history
- [ ] Audit view + minimal admin (connectors, users)
- [ ] Saved queries as lightweight reports
- [ ] Error/degradation states: connector down, slow, partial answer

**Exit:** founder can run the full demo end-to-end alone, no rehearsed workarounds.

## Phase 5 — Show it *(≈1 week)*

- [ ] Demo script built around the killer questions
- [ ] Marketing page refreshed to the analyst + compliance story (ideally live demo embed)
- [ ] Shown to ≥3 people outside the project; feedback recorded in the decision log
- [ ] Design-partner conversations start

**Exit:** three external reactions recorded; pricing and brand decisions unblocked.

---

## Standing rules

- Read-only V1. No CRUD against source systems, anywhere.
- No new connectors, billing, onboarding, workflows, launcher, or Slack/Teams bot until
  Phase 5 is done.
- Security rules in `CLAUDE.md` bind all new code.
- Every settled decision goes into `CLAUDE.md`'s decision log the day it's made.

## Needs from the founder

- Configure SAP + Salesforce sandboxes in the connector setup UI when Phase 3 delivers
  it (credentials stay with the founder until then)
- Azure AD tenant/app IDs already in Vercel env (Phase 2)
- Impressum + privacy content (legal gap, any time before public launch)
- 3 candidate design-partner companies (by Phase 5)
