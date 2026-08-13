/**
 * Fail-closed environment access (security rule 3).
 * A missing variable throws EnvMissingError; callers translate that into a
 * 503 — never a fallback value, never a silently degraded mode.
 */
export class EnvMissingError extends Error {
  constructor(public readonly variable: string) {
    super(`Required environment variable ${variable} is not set`);
    this.name = "EnvMissingError";
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new EnvMissingError(name);
  return v;
}

export function envConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}
