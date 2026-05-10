# Trelleborg Pilot Deployment — Checklist

**Goal:** Allow `abdul.nandalpad@trelleborg.com` (and other Trelleborg employees) 
to log into EnterpriseHub at `enterprises-hub.de` using their existing Microsoft credentials 
and access SAP C4C, Teams, and other Trelleborg apps in one place.

---

## The Problem Right Now

Our Azure App Registration is set to **"My organization only"** — meaning only accounts 
from our own (personal/trial) Azure AD tenant can log in. Trelleborg employees can't.

---

## What Needs to Change

### 1. Azure App Registration — Make it Multi-Tenant

In portal.azure.com → EnterpriseHub → Authentication:
- Change **"Supported account types"** from  
  `Accounts in this organizational directory only`  
  to  
  `Accounts in any organizational directory (Any Azure AD tenant)`
- Save

### 2. Update MSAL Config in Code

Change the `authority` in `src/lib/msal.ts` from the specific tenant ID to `common`:

```ts
authority: "https://login.microsoftonline.com/common",
```

This allows users from **any** Azure AD tenant (including Trelleborg) to log in.

### 3. Update App URLs for Trelleborg

In `src/lib/apps.ts`, update the URLs to Trelleborg's actual systems:

| App | What to change |
|---|---|
| SAP C4C | Replace with Trelleborg's C4C tenant URL |
| SAP S/4 HANA | Replace with Trelleborg's S/4 URL |
| Microsoft Teams | `teams.microsoft.com` works as-is (universal) |
| Jira | Replace `your-org` with Trelleborg's Atlassian subdomain |
| ServiceNow | Replace with Trelleborg's ServiceNow instance URL |
| Salesforce | Replace with Trelleborg's Salesforce org URL |
| Adobe Sign | Works as-is (universal login) |
| Power BI | `app.powerbi.com` works as-is |

### 4. Trelleborg IT — Admin Consent (One-Time)

When a Trelleborg user first logs in, Microsoft will ask for **admin consent** — 
a Trelleborg IT admin needs to approve EnterpriseHub to access their tenant once.

Either:
- You log in with your `abdul.nandalpad@trelleborg.com` account and self-consent (if you have admin rights), OR
- Send Trelleborg IT this consent URL (replace CLIENT_ID):
  ```
  https://login.microsoftonline.com/trelleborg.com/adminconsent?client_id=5e17bab0-b51a-441c-8617-6d6964604d02
  ```

---

## What SSO Actually Does Here

Once Trelleborg logs in via Microsoft:
- **Teams** → opens directly, already authenticated (same Microsoft account)
- **Power BI** → same, Microsoft account carries over
- **SAP C4C / S/4** → if Trelleborg has SAP SSO configured with Azure AD, it will carry over automatically. If not, they'll still need to log into SAP separately (this is a Trelleborg IT config, not ours)
- **Jira / ServiceNow** → depends on whether Trelleborg has SSO set up for those tools

---

## Tomorrow's Test Plan

1. Make Azure multi-tenant (step 1 above)
2. Update `authority` to `common` in code and push
3. Open `enterprises-hub.de` in browser
4. Log in with `abdul.nandalpad@trelleborg.com`
5. Check: does Teams open without asking for login again?
6. Note which apps need their URLs updated to Trelleborg-specific instances

---

## Summary

| Task | Who | Time |
|---|---|---|
| Change Azure to multi-tenant | You (portal.azure.com) | 2 min |
| Update authority to `common` | Me (code change) | 5 min |
| Update app URLs to Trelleborg's | You (provide URLs) + Me (update code) | 15 min |
| Trelleborg admin consent | Trelleborg IT or you (if admin) | 5 min |
| Test with trelleborg.com account | You | Tomorrow |
