/**
 * Microsoft Teams Graph API scopes.
 *
 * Both scopes are delegated (user-consentable — no admin approval required).
 * Acquired via incremental consent on first Teams context request.
 *
 * Team.ReadBasic.All  — list the teams the user is a member of
 * Chat.ReadBasic      — list chat threads metadata (no message content)
 */

export const TEAMS_SCOPES = [
  "Team.ReadBasic.All",
  "Chat.ReadBasic",
] as const;
