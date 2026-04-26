// Design Ref: §4 — AI 키 AES-256-GCM 암호화
// 보안 리뷰: security-architect (2026-04-26)

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

const ALGORITHM: CipherGCMTypes = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit, NIST 권장 (GCM)
const KEY_LENGTH = 32; // 256-bit
const CURRENT_KEY_VERSION = 1;

export type EncryptedPayload = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
};

function getEncryptionKey(version: number = CURRENT_KEY_VERSION): Buffer {
  const envName =
    version === CURRENT_KEY_VERSION
      ? "AI_KEY_ENCRYPTION_SECRET"
      : `AI_KEY_ENCRYPTION_SECRET_V${version}`;

  const secretHex = process.env[envName];
  if (!secretHex) {
    throw new Error(
      `${envName} is not set. Generate with: openssl rand -hex 32`,
    );
  }

  const key = Buffer.from(secretHex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `${envName} must decode to ${KEY_LENGTH} bytes (got ${key.length}). Use 64 hex chars.`,
    );
  }

  return key;
}

export function encryptApiKey(plaintext: string): EncryptedPayload {
  if (!plaintext) {
    throw new Error("encryptApiKey: plaintext is empty");
  }

  const key = getEncryptionKey(CURRENT_KEY_VERSION);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    authTag,
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptApiKey(payload: EncryptedPayload): string {
  const { ciphertext, iv, authTag, keyVersion } = payload;
  const key = getEncryptionKey(keyVersion);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
