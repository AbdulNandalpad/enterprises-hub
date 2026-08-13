# EnterpriseHub v2 — Build Plan

*Phases are sequential; each has an exit criterion that must be true before the next
starts. Durations assume one founder + Claude working steadily.*

## Phase 0 — Foundations on paper + sandbox truth *(days)*

- [x] Vision, architecture, and decisions recorded in the repo (`docs/`)
- [ ] **Sandbox verification** — connect to the SAP OData and Salesforce sandbox APIs
      with a throwaway script; inventory what entities/data actually exist
- [ ] **Overlap check** — confirm the two sandboxes share customers so cross-system
      joins return real hits; seed matching records if they don't
- [ ] **Finalize the 10 killer questions** against what the sandboxes really hold
      (≥4 cross-system). These are the spec for the query engine.

**Exit:** every killer question has known source entities in both sandboxes.

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

- [ ] SAP connector: read-only OData, on-behalf-of pattern, health check
- [ ] Salesforce connector: read-only, user-context OAuth, health check
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

- SAP + Salesforce sandbox credentials (Phase 0)
- Azure AD tenant/app IDs already in Vercel env (Phase 2)
- Impressum + privacy content (legal gap, any time before public launch)
- 3 candidate design-partner companies (by Phase 5)
