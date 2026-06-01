import { Configuration, PublicClientApplication, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    // "organizations" = any Azure AD work/school account (multi-tenant).
    // Set NEXT_PUBLIC_AZURE_TENANT_ID to lock to a single tenant (dev/test only).
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "organizations"}`,
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : "https://www.enterprises-hub.de/login",
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

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}
