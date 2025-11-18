import cryptoPromise from "@crypto/qubic/index.js";
import { QubicDefinitions } from "@crypto/qubic/QubicDefinitions";
import { bytesToHex, hexToBytes } from "@src/utils/bytes";
import BigNumber from "bignumber.js";

const HEX_32_BYTES = /^[0-9a-fA-F]{64}$/;
const IDENTITY_REGEX = /^[A-Z]{60}$/;
const A_CHAR_CODE = "A".charCodeAt(0);
const IDENTITY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PUBLIC_KEY_CHUNK = 8;
const CHARS_PER_CHUNK = 14;

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

async function computeIdentityFromPublicKey(
  publicKey: Uint8Array,
  crypto?: Awaited<typeof cryptoPromise>,
) {
  const cryptoInstance = crypto ?? (await cryptoPromise);
  let identity = "";

  for (let chunkIndex = 0; chunkIndex < 4; chunkIndex++) {
    let longNumber = new BigNumber(0);
    publicKey
      .slice(chunkIndex * PUBLIC_KEY_CHUNK, (chunkIndex + 1) * PUBLIC_KEY_CHUNK)
      .forEach((val, index) => {
        const add = new BigNumber((val * 256 ** index).toString(2), 2);
        longNumber = longNumber.plus(add);
      });

    for (let j = 0; j < CHARS_PER_CHUNK; j++) {
      identity += String.fromCharCode(
        longNumber.mod(26).plus(IDENTITY_ALPHABET.charCodeAt(0)).toNumber(),
      );
      longNumber = longNumber.div(26);
    }
  }

  const digest = new Uint8Array(QubicDefinitions.DIGEST_LENGTH);
  cryptoInstance.K12(publicKey, digest, QubicDefinitions.DIGEST_LENGTH);

  const c0 = digest[0] ?? 0;
  const c1 = digest[1] ?? 0;
  const c2 = digest[2] ?? 0;
  let checksumValue = ((c2 << 16) | (c1 << 8) | c0) & 0x3ffff;
  for (let i = 0; i < 4; i++) {
    identity += String.fromCharCode((checksumValue % 26) + IDENTITY_ALPHABET.charCodeAt(0));
    checksumValue = Math.floor(checksumValue / 26);
  }

  return identity;
}

export async function publicKeyBytesToIdentity(publicKey: Uint8Array) {
  return computeIdentityFromPublicKey(publicKey);
}

export async function publicKeyHexToIdentity(publicKeyHex: string) {
  if (!HEX_32_BYTES.test(publicKeyHex)) {
    throw new Error("publicKeyHex must be 32-byte hex");
  }
  const bytes = hexToBytes(publicKeyHex);
  return computeIdentityFromPublicKey(bytes);
}
