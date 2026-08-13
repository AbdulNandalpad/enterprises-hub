/**
 * Azure AD sign-in via MSAL Node confidential client (security rule 1:
 * never roll custom auth). Server-side OIDC authorization-code flow;
 * the browser never touches tokens.
 */
import { ConfidentialClientApplication } from "@azure/msal-node";
import { requireEnv } from "@/core/env";

const SCOPES = ["openid", "profile", "email"];

function client(): ConfidentialClientApplication {
  return new ConfidentialClientApplication({
    auth: {
      clientId: requireEnv("AZURE_AD_CLIENT_ID"),
      authority: `https://login.microsoftonline.com/${requireEnv("AZURE_AD_TENANT_ID")}`,
      clientSecret: requireEnv("AZURE_AD_CLIENT_SECRET"),
    },
  });
}

export async function buildSignInUrl(state: string): Promise<string> {
  return client().getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: requireEnv("AZURE_AD_REDIRECT_URI"),
    state,
  });
}

export interface AzureIdentity {
  sub: string;
  name: string;
  email: string;
  /** Azure AD directory (tid) — resolves which tenant DB this user belongs to. */
  directoryId: string;
}

export async function redeemAuthCode(code: string): Promise<AzureIdentity> {
  const result = await client().acquireTokenByCode({
    scopes: SCOPES,
    redirectUri: requireEnv("AZURE_AD_REDIRECT_URI"),
    code,
  });
  const claims = (result.idTokenClaims ?? {}) as Record<string, unknown>;
  const sub = typeof claims.oid === "string" ? claims.oid : String(claims.sub ?? "");
  const tid = typeof claims.tid === "string" ? claims.tid : "";
  const name = typeof claims.name === "string" ? claims.name : "";
  const email =
    typeof claims.preferred_username === "string" ? claims.preferred_username :
    typeof claims.email === "string" ? claims.email : "";
  if (!sub || !tid) throw new Error("Azure AD token missing oid/tid claims");
  return { sub, name: name || email, email, directoryId: tid };
}
