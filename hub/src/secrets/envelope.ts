/**
 * Envelope encryption for per-tenant secrets (architecture amendment 4).
 * MASTER_KEY_B64 (env, KMS later) wraps per-tenant data keys; data keys
 * encrypt connector credentials. Data keys are stored wrapped in the
 * control plane — never inside the tenant schema they protect.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { requireEnv } from "@/core/env";

const ALG = "aes-256-gcm";

function masterKey(): Buffer {
  const key = Buffer.from(requireEnv("MASTER_KEY_B64"), "base64");
  if (key.length !== 32) throw new Error("MASTER_KEY_B64 must decode to 32 bytes");
  return key;
}

export interface Sealed {
  ivB64: string;
  tagB64: string;
  dataB64: string;
}

function seal(key: Buffer, plaintext: Buffer): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ivB64: iv.toString("base64"),
    tagB64: cipher.getAuthTag().toString("base64"),
    dataB64: data.toString("base64"),
  };
}

function open(key: Buffer, sealed: Sealed): Buffer {
  const decipher = createDecipheriv(ALG, key, Buffer.from(sealed.ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.dataB64, "base64")),
    decipher.final(),
  ]);
}

/** Create a fresh tenant data key, returned wrapped for control-plane storage. */
export function generateWrappedDataKey(): Sealed {
  return seal(masterKey(), randomBytes(32));
}

export function encryptWithDataKey(wrappedKey: Sealed, plaintext: string): Sealed {
  const dataKey = open(masterKey(), wrappedKey);
  return seal(dataKey, Buffer.from(plaintext, "utf8"));
}

export function decryptWithDataKey(wrappedKey: Sealed, sealed: Sealed): string {
  const dataKey = open(masterKey(), wrappedKey);
  return open(dataKey, sealed).toString("utf8");
}
