/**
 * Azure AD / Microsoft Entra ID token verification.
 *
 * Verifies MSAL ID tokens server-side using Microsoft's JWKS endpoint.
 * jose handles JWKS caching and key-rotation automatically.
 *
 * Docs: https://learn.microsoft.com/en-us/azure/active-directory/develop/id-tokens
 */

import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

// Common JWKS endpoint — works for all Azure AD tenants (multi-tenant app).
// jose fetches once, caches, and re-fetches automatically on key rotation.
const AZURE_JWKS = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);

export interface AzureClaims {
  email:    string;
  tenantId: string;
  name?:    string;
  oid?:     string; // Azure AD Object ID — stable, unique per user per tenant
}

/**
 * Verify a Microsoft ID token issued by Azure AD.
 *
 * Returns verified claims on success.
 * Returns null on any failure (expired, wrong audience, tampered, Azure not configured).
 *
 * Token expectations:
 *   aud = NEXT_PUBLIC_AZURE_CLIENT_ID
 *   iss = https://login.microsoftonline.com/{tid}/v2.0
 */
export async function verifyAzureIdToken(token: string): Promise<AzureClaims | null> {
  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
  if (!clientId) return null; // Azure AD not configured on this deployment

  try {
    // Step 1: Decode without verification just to extract tid for the issuer URL.
    // We don't trust these values yet — they only build the expected issuer string.
    const raw = decodeJwt(token);
    const tid = typeof raw.tid === "string" ? raw.tid : null;
    if (!tid) return null;

    // Step 2: Verify signature, audience, issuer, expiry.
    const { payload } = await jwtVerify(token, AZURE_JWKS, {
      audience: clientId,
      issuer:   `https://login.microsoftonline.com/${tid}/v2.0`,
    });

    // Step 3: Extract email — Azure AD uses preferred_username or email claim.
    const email = (
      typeof payload.preferred_username === "string" ? payload.preferred_username :
      typeof payload.email              === "string" ? payload.email :
      null
    )?.toLowerCase().trim() ?? null;

    if (!email || !email.includes("@")) return null;

    return {
      email,
      tenantId: tid,
      name: typeof payload.name === "string" ? payload.name : undefined,
      oid:  typeof payload.oid  === "string" ? payload.oid  : undefined,
    };
  } catch {
    // Any failure — invalid signature, expired, wrong audience — all silent null.
    return null;
  }
}
