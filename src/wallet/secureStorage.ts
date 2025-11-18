import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const DEFAULT_ITERATIONS = 200_000;

export interface EncryptedSecret {
  cipherText: string;
  iv: string;
  salt: string;
  tag: string;
  iterations: number;
}

function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  return pbkdf2Sync(password, salt, iterations, KEY_BYTES, "sha512");
}

export function encryptSecret(
  secret: string,
  password: string,
  iterations = DEFAULT_ITERATIONS,
): EncryptedSecret {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = deriveKey(password, salt, iterations);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  key.fill(0);
  return {
    cipherText: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
    iterations,
  };
}

export function decryptSecret(payload: EncryptedSecret, password: string): string {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const cipherText = Buffer.from(payload.cipherText, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const key = deriveKey(password, salt, payload.iterations);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  key.fill(0);
  return plaintext.toString("utf8");
}

export class SecureBuffer {
  private buffer: Uint8Array;

  constructor(length: number) {
    this.buffer = new Uint8Array(length);
  }

  static fromString(secret: string) {
    const buf = new SecureBuffer(secret.length);
    for (let i = 0; i < secret.length; i++) {
      buf.buffer[i] = secret.charCodeAt(i);
    }
    return buf;
  }

  zeroize() {
    this.buffer.fill(0);
  }

  toString() {
    return String.fromCharCode(...this.buffer);
  }
}
