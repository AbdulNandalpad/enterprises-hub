# Connectors — the "wrapper → next → next → go" model

A short guide to what a connector is, how the wrapper model works, and the exact
steps to connect a client's systems during onboarding.

---

## 1. What a connector is

A **connector** lets EnterpriseHub talk to another system's API on the client's
behalf. Every connector bundles three things:

1. **Where** — the system's API endpoint (e.g. `https://acme.service-now.com/api/…`)
2. **How to sign in** — the credential or token the system trusts (OAuth, API key, Basic Auth…)
3. **What it may read/do** — the scopes/permissions granted

## 2. What a "wrapper" is

A **wrapper** is a *pre-built* connector — the endpoint shape, the auth method,
and the AI scopes are already baked into the registry
(`src/lib/integrations/registry.ts`). The client never designs a connector.
They only supply the one tenant-specific thing their **lane** needs, then click
through: **Review → Authorize → Go live.**

> One registry entry = one wrapper. Adding a system to the catalogue = adding one
> entry. No per-client engineering.

## 3. The three onboarding lanes

The wizard reads each wrapper's `configType` and picks a lane. The lane decides
how much the client does in the **Authorize** step.

| Lane | What the client does | `configType` values | Examples |
|---|---|---|---|
| 🟢 **Instant** | Nothing. Already connected via Azure AD SSO, or it's just a launcher. | `always-on`, `app-link` | Microsoft 365, SharePoint, Azure, Power BI |
| 🔵 **One-click** | Click **Connect**, approve on the vendor's own screen, land back. No keys. | `shared-org-oauth`, `personal-oauth` | Salesforce, Dynamics 365, Teams |
| 🟡 **Paste-key** | Paste a service-account URL + key their IT team provides. One time. | `shared-org-api`, `shared-org-mcp`, `personal-credentials` | SAP, ServiceNow, Jira, AWS, HubSpot |

**Why not everything is instant:** for EnterpriseHub to read a client's live
data, *something* has to prove to that system the request is authorized. That
proof has to come from where the vendor controls it. "Next-next-go" is only
possible when the handshake already exists — which is exactly why Microsoft/Azure
is instant (it rides the login) and third-party SaaS is one-click OAuth.

## 4. The wizard — what the admin sees

Open **Admin → Connectors**, click any connector. Three steps, always:

```
  1 ─ Review     What it connects · what the AI reads · how it signs in · where secrets live
  2 ─ Authorize  (adapts to the lane — see below)
  3 ─ Go live    Test connection · add to sidebar · switch on
```

**Step 2 by lane:**
- 🟢 Instant → a green "Nothing to authorize" panel. Next.
- 🔵 One-click → a **Connect with {system}** button → vendor consent screen → back.
- 🟡 Paste-key → three fields: **Instance URL**, **Client ID / API user**, **Secret / API key**.
  (SAP shows an optional **Advanced** block for per-user access — see §6.)

Secrets are encrypted at rest in the client's tenant database, never shown to
users, never logged.

## 5. Client onboarding — the runbook

For each client, during onboarding:

1. **Sign the client in with Azure AD.** The moment SSO is live, every 🟢
   *instant* wrapper (Microsoft 365, SharePoint, Teams, Azure, Power BI) is
   already connected. Nothing to configure.

2. **Do the 🔵 one-click systems together on the call.** Open the connector,
   click **Connect with {system}**, have the client's admin approve on the vendor
   screen. Done in under a minute each. (Salesforce, Dynamics, etc.)

3. **Collect 🟡 paste-key credentials once.** Ask the client's IT team for, per
   system: the instance URL + a **read-only service account** (username + key).
   Paste them in the Authorize step. Hit **Test connection** in Go live to
   confirm, then switch on.

4. **Flip each connector live** and decide **Add to everyone's sidebar** if it
   should appear in the left nav.

That's the whole flow. A typical client is live on their Microsoft stack
instantly, their SaaS in a few OAuth clicks, and their ERP/ITSM after one
credential hand-off from IT.

## 6. SAP / on-prem note

Firewalled and on-prem systems (classic SAP, self-hosted ERP) still need a
one-time network + service-account setup — no wizard removes that. Two options:

- **Shared service account** (default paste-key): the AI queries SAP as one
  service user. Simplest.
- **Per-user access** (optional *Advanced* block in Authorize): the AI queries
  SAP *as the logged-in user* via SAML Bearer, so SAP enforces each person's own
  authorizations. Requires a one-time SAML trust from the client's SAP Basis team
  (token endpoint + resource URL).

After the one-time network setup, adding further systems behind that route is
back to next-next-go.

## 7. Adding a new wrapper to the catalogue

1. Add one entry to `INTEGRATIONS` in `src/lib/integrations/registry.ts`.
2. Set its `configType` — that alone picks the onboarding lane.
3. Set `authHint` (shown in Authorize) and `scopes` (shown in Review) if relevant.
4. For a real one-click OAuth flow, wire a start endpoint and reference it in
   `oauthStartUrl()` inside `ConnectorWizard.tsx` (Salesforce is the reference).

No UI work needed — the wizard renders the right lane automatically.
