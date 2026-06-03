/**
 * AES-256-GCM encryption for IMAP passwords stored in Supabase.
 *
 * Key source (priority):
 *   1. IMAP_ENCRYPTION_KEY env var — 64 hex chars (32 bytes)
 *   2. SHA-256 of SUPABASE_SERVICE_ROLE_KEY — auto-derived, no extra config needed
 *
 * Encrypted format: "<iv_b64url>.<authTag_b64url>.<data_b64url>"
 * This is safe to store in a text column.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function getKey(): Buffer {
  const keyHex = process.env.IMAP_ENCRYPTION_KEY;
  if (keyHex && keyHex.length === 64) {
    return Buffer.from(keyHex, "hex");
  }
  // Auto-derive from the Supabase service role key — deterministic, no extra env var needed
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "enterprises-hub-imap-fallback";
  return createHash("sha256").update(seed).digest();
}

export function encryptPassword(password: string): string {
  const key  = getKey();
  const iv   = randomBytes(12);
  const ciph = createCipheriv("aes-256-gcm", key, iv);
  const enc  = Buffer.concat([ciph.update(password, "utf8"), ciph.final()]);
  const tag  = ciph.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptPassword(encrypted: string): string {
  const key   = getKey();
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivB64, tagB64, dataB64] = parts;
  const deciph = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  deciph.setAuthTag(Buffer.from(tagB64, "base64url"));
  const data = Buffer.from(dataB64, "base64url");
  return deciph.update(data).toString("utf8") + deciph.final("utf8");
}
