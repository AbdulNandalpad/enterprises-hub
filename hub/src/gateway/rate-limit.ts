/**
 * In-process token bucket (security rule 9). Redis replaces this when the
 * recorded trigger fires (see docs/ARCHITECTURE.md); the interface stays.
 */
const buckets = new Map<string, { tokens: number; refilledAt: number }>();

export function checkRateLimit(
  key: string,
  maxPerWindow: number,
  windowSeconds: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: maxPerWindow, refilledAt: now };
  const elapsed = (now - bucket.refilledAt) / 1000;
  bucket.tokens = Math.min(maxPerWindow, bucket.tokens + (elapsed * maxPerWindow) / windowSeconds);
  bucket.refilledAt = now;
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
