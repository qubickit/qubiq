import { bytesToHex } from "@src/utils/bytes";

const HEX_32_BYTES = /^[0-9a-fA-F]{64}$/;
const IDENTITY_REGEX = /^[A-Z]{60}$/;
const A_CHAR_CODE = "A".charCodeAt(0);

function identityToPublicKeyBytes(identity: string): Uint8Array {
  if (!IDENTITY_REGEX.test(identity)) {
    throw new Error("identity must be 60 uppercase letters");
  }

  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);

  for (let chunk = 0; chunk < 4; chunk++) {
    view.setBigUint64(chunk * 8, 0n, true);
    for (let j = 14; j-- > 0; ) {
      const charIndex = identity.charCodeAt(chunk * 14 + j) - A_CHAR_CODE;
      if (charIndex < 0 || charIndex >= 26) {
        throw new Error("identity contains invalid characters");
      }
      const current = view.getBigUint64(chunk * 8, true);
      view.setBigUint64(chunk * 8, current * 26n + BigInt(charIndex), true);
    }
  }

  return bytes;
}

export function normalizePublicKeyHex(value: string): string {
  if (HEX_32_BYTES.test(value)) {
    return value.toLowerCase();
  }

  if (IDENTITY_REGEX.test(value)) {
    return bytesToHex(identityToPublicKeyBytes(value));
  }

  throw new Error("public key must be 32-byte hex or 60-letter identity");
}
