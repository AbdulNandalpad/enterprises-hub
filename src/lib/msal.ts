import { type Configuration, PublicClientApplication, LogLevel } from "@azure/msal-browser";

/**
 * Build the MSAL config at call-time (inside getMsalInstance) so that
 * window.location.origin is always evaluated in the browser, never on the
 * server.  A static const evaluated at module-parse time would get the SSR
 * value (undefined window) and fall back to a hardcoded URL — wrong for any
 * tenant domain that isn't enterprises-hub.de.
 */
function buildMsalConfig(): Configuration {
  return {
    auth: {
      clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
      // "organizations" = any Azure AD work/school account (multi-tenant).
      // Set NEXT_PUBLIC_AZURE_TENANT_ID to lock to a single tenant (dev/test only).
      authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "organizations"}`,
      // Always use the CURRENT origin so tenant domains (hub.servicesphere.de,
      // hub.acme.com, …) get the right redirect URI automatically.
      // getMsalInstance() is only ever called inside a browser useEffect,
      // so window is guaranteed to exist here.
      redirectUri: `${window.location.origin}/login`,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          if (level === LogLevel.Error) console.error(message);
        },
      },
    },
  };
}

export const loginRequest = {
  scopes: [
    "openid", "profile", "email",
    "User.Read",
    "Calendars.Read",
    "Mail.ReadBasic",
    "Team.ReadBasic.All",
    "Chat.ReadBasic",
  ],
};

let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(buildMsalConfig());
  }
  return _msalInstance;
}
