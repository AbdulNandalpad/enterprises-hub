# EnterpriseHub — Vision

*Source: founder's one-pager (Aug 2026), amended by the v2 rethink discussion. This is
the north-star document — the 5-year story. The build order lives in `docs/PLAN.md`;
what ships first is deliberately much narrower.*

## The vision

One unified interface for every application in the enterprise. Any organization can
access, query, and report on all of its business applications — without switching
context, re-authenticating, or learning each system's UI. Users ask one plain-language
question and get one synthesized answer, launch any app through existing SSO, and build
cross-system reports without code — all governed by a secure proxy layer and full
compliance logging.

## Core capabilities (target state)

1. **One question, one answer** — plain language in, one synthesized answer across every
   relevant system; no need to know where the data lives.
2. **SSO-first app access** — every company app launchable from the hub through existing
   SSO; no credential sprawl.
3. **Secure proxy layer** — one external-facing API proxies all core systems; external
   callers never touch internal infrastructure.
4. **No-code cross-system reporting** — management reports pulled from multiple systems
   in one UI, without engineering effort.
5. **Identity-aware answers** — every query and report runs on-behalf-of the requesting
   user; people only ever see what they're entitled to.
6. **Natural-language interface** — no query languages or dashboards to learn.
7. **Built-in compliance logging** — every AI query and response recorded with a full
   audit trail, aligned to EU AI Act requirements.
8. **Self-serve connectivity** — new systems connect in a few clicks.

## V1 scope decision

**Read-only (GET) across all connected systems.** Full CRUD comes in a later release,
once the connector framework, permission model, and audit trail are proven at scale.

## Sequencing (settled in the v2 rethink)

The vision describes four products. They are built as one wedge plus three expansions:

- **The wedge is the AI analyst** (capabilities 1, 5, 6, 7): question → identity-scoped
  answer with citations → audit entry. SAP + Salesforce only, deep, proven on live
  sandboxes. This is what v2 builds and demos.
- **Reporting falls out of the analyst** — a saved, scheduled, shareable query is a
  report. No separate report-builder product until the analyst is proven.
- **The app launcher is a retention feature, not a wedge** — Okta/Entra tile pages are
  free commodities. It arrives after the analyst earns the daily visit.
- **Self-serve connectivity is a platform play** — it matters at connector #10, not
  connector #2. The Connector SDK spec is *extracted from* the two hand-built
  connectors, not written before them.

## Open questions carried from the one-pager

- Trust UX: source attribution on every answer, a confidence signal, and a fallback
  path when systems disagree or data is stale — must be visible in the core screen design.
- Compliance beyond the EU AI Act: data residency, SOC 2 / ISO 27001 posture if going
  global.
- Who is the paying user: analysts/leaders pay (platform pricing), all-employees is the
  expansion motion. Working assumption until design partners say otherwise.
