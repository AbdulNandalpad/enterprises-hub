# Generic Connector Architecture (short)

**Idea:** one generic *governed* engine + per-connector config.
Build identity / OBO / audit / safety **once**; admin configures
**endpoint + auth + tools** per system. (The SAP C4C diagram = connector #1.)

---

## 1. Connector spec — what the admin fills in
```ts
interface ConnectorSpec {
  id: string;          // "sap-c4c" | "salesforce"
  name: string;
  baseUrl: string;     // API root
  auth: AuthConfig;    // which adapter + its settings (see §2)
  tools: ToolDef[];    // exposed actions
  env: "qa" | "production";
}

interface ToolDef {
  name: string;        // "getAccount" | "createQuote"
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;        // "/AccountCollection"
  write?: boolean;     // true -> confirm-before-write
  input: Record<string, { type: string; required?: boolean }>;
}
```

## 2. Pluggable auth adapter — the special-per-system part
```ts
interface AuthAdapter {
  type: "saml-bearer" | "oauth-obo" | "api-key" | "basic";
  // turn the logged-in user's Azure AD token into a token the target trusts
  getUserToken(ctx: { userToken: string; spec: ConnectorSpec }): Promise<string>;
}
```
- `saml-bearer` → SAP (Destination Service + XSUAA)
- `oauth-obo`   → Salesforce / M365
- `api-key` / `basic` → simpler systems

## 3. Generic engine — built once, every connector reuses
- MCP transport (JSON-RPC / SSE) + tool registry & routing
- Validate Azure AD token (JWKS) → run **every** call On-Behalf-Of the user
- Safety: CSRF, confirm-before-write, rate limit
- **Audit log** every action (who / what / when)
- QA ↔ Production isolation, error sanitization

## 4. Example — config only, zero code per system
| Connector | baseUrl | auth | tools |
|---|---|---|---|
| SAP C4C | …/c4c/odata | `saml-bearer` | getAccount, createQuote… |
| Salesforce | …/services/data | `oauth-obo` | getLead, createOpp… |
| ServiceNow | …/api/now | `api-key` | getTicket, updateTicket… |

## 5. Maps to existing EnterpriseHub pieces
- **Engine** = generic MCP server (to build)
- **ConnectorSpec** = `ConnectorSetupPage` wizard + `INTEGRATIONS` registry + `connector_configs` table
- **AuthAdapter "saml-bearer"** = the wizard's Principal Propagation step
- AI front-end = EnterpriseHub's own GPT-4o layer (replaces Copilot Studio)
