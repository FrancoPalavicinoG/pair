import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { ConfigError, DecryptionError } from "@pair/core";
import type { EncryptedPayload } from "./schema/garmin-credentials";

const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // estandar para GCM
const AUTH_TAG_BYTES = 16;

let cachedMasterKey: Buffer | undefined;

// Lee ENCRYPTION_MASTER_KEY y la cachea en memoria del proceso.
function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new ConfigError("ENCRYPTION_MASTER_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new ConfigError(`ENCRYPTION_MASTER_KEY must decode to ${KEY_BYTES} bytes`);
  }
  cachedMasterKey = key;
  return key;
}

// Deriva una subclave por usuario a partir de la master key.
function deriveUserKey(masterKey: Buffer, userId: string): Buffer {
  return createHmac("sha256", masterKey).update(userId).digest();
}

// Cifra el plaintext con la subclave del usuario (AES-256-GCM).
export function seal(plaintext: string, userId: string): EncryptedPayload {
  const userKey = deriveUserKey(getMasterKey(), userId);
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv("aes-256-gcm", userKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64") as EncryptedPayload;
}

// Descifra el payload con la subclave del usuario.
export function open(payload: EncryptedPayload, userId: string): string {
  const userKey = deriveUserKey(getMasterKey(), userId);
  const combined = Buffer.from(payload, "base64");

  const iv = combined.subarray(0, IV_BYTES);
  const authTag = combined.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = combined.subarray(IV_BYTES + AUTH_TAG_BYTES);

  try {
    const decipher = createDecipheriv("aes-256-gcm", userKey, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (cause) {
    throw new DecryptionError("Failed to decrypt payload: wrong key or corrupted ciphertext", {
      cause,
    });
  }
}
