import sodium from "libsodium-wrappers";
import { ConfigError, DecryptionError } from "@pair/core";
import type { EncryptedPayload } from "./schema/garmin-credentials";

let cachedMasterKey: Uint8Array | undefined;

// Lee ENCRYPTION_MASTER_KEY y la cachea en memoria del proceso.
async function getMasterKey(): Promise<Uint8Array> {
  await sodium.ready;
  if (cachedMasterKey) return cachedMasterKey;

  const raw = process.env.ENCRYPTION_MASTER_KEY;
  if (!raw) {
    throw new ConfigError("ENCRYPTION_MASTER_KEY is not set");
  }
  const key = sodium.from_base64(raw, sodium.base64_variants.ORIGINAL);
  if (key.length !== sodium.crypto_generichash_KEYBYTES) {
    throw new ConfigError(
      `ENCRYPTION_MASTER_KEY must decode to ${sodium.crypto_generichash_KEYBYTES} bytes`,
    );
  }
  cachedMasterKey = key;
  return key;
}

// Deriva una subclave por usuario a partir de la master key.
function deriveUserKey(masterKey: Uint8Array, userId: string): Uint8Array {
  return sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    sodium.from_string(userId),
    masterKey,
  );
}

// Cifra el plaintext con la subclave del usuario.
export async function seal(plaintext: string, userId: string): Promise<EncryptedPayload> {
  const masterKey = await getMasterKey();
  const userKey = deriveUserKey(masterKey, userId);

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(sodium.from_string(plaintext), nonce, userKey);

  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);

  return sodium.to_base64(combined, sodium.base64_variants.ORIGINAL) as EncryptedPayload;
}

// Descifra el payload con la subclave del usuario.
export async function open(payload: EncryptedPayload, userId: string): Promise<string> {
  const masterKey = await getMasterKey();
  const userKey = deriveUserKey(masterKey, userId);

  const combined = sodium.from_base64(payload, sodium.base64_variants.ORIGINAL);
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

  try {
    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, userKey);
    return sodium.to_string(plaintext);
  } catch (cause) {
    throw new DecryptionError("Failed to decrypt payload: wrong key or corrupted ciphertext", {
      cause,
    });
  }
}
