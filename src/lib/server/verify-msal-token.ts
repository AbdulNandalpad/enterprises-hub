/**
 * Server-side Azure AD / MSAL ID-token verification.
 *
 * Uses the `jose` library to validate tokens against Azure AD's published
 * JWKS endpoint.  Signature, expiry, and audience are all verified.
 *
 * Issuer check is intentionally relaxed to allow any Azure AD tenant
 * (required for multi-tenant "organizations" authority apps).
 *
 * Usage:
 *   const email = await verifyMsalIdToken(req);
 *   // email is null if missing/invalid; string if verified
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

// Azure AD v2.0 common JWKS — same keys are used by all tenants
const AZURE_JWKS_URI = "https://login.microsoftonline.com/common/discovery/v2.0/keys";

// Cache the JWKS fetcher across requests (jose handles key rotation automatically)
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(AZURE_JWKS_URI), {
      cacheMaxAge: 10 * 60 * 1000, // cache keys for 10 minutes
    });
  }
  return _jwks;
}

/**
 * Verify an Azure AD ID token.
 * Returns the user's email/preferred_username, or null on failure.
 */
export async function verifyMsalIdToken(token: string): Promise<string | null> {
  try {
    const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
    if (!clientId) return null;

    const { payload } = await jwtVerify(token, getJwks(), {
      audience:  clientId,
      // Issuer is NOT checked here because multi-tenant apps receive tokens from
      // any tenant's issuer URL (https://login.microsoftonline.com/{tenantId}/v2.0).
      // Audience + signature + expiry provide the necessary security guarantees.
      clockTolerance: 60, // allow 60s clock skew
    });

    // Prefer preferred_username → email → upn claim
    const email =
      (payload["preferred_username"] as string | undefined) ??
      (payload["email"] as string | undefined) ??
      (payload["upn"] as string | undefined);

    if (!email || !email.includes("@")) return null;
    return email.toLowerCase().trim();
  } catch {
    return null;
  }
}

/**
 * Extract and verify the email from an incoming API request.
 *
 * Reads Authorization: Bearer <idToken> header.
 * Returns verified email string, or null if missing / invalid.
 *
 * Falls back to X-User-Email ONLY in development mode (so local testing
 * without a real token still works).  In production the header is always
 * verified.
 */
export async function extractVerifiedEmail(req: import("next/server").NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return verifyMsalIdToken(token);
  }

  // Dev-only fallback: plain X-User-Email header (not verified)
  if (process.env.NODE_ENV !== "production") {
    const devEmail = req.headers.get("x-user-email")?.toLowerCase().trim();
    return devEmail ?? null;
  }

  return null;
}
