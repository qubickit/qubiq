import cryptoPromise from "@crypto/qubic/index.js";
import { bytesToHex } from "@src/utils/bytes";
import { publicKeyBytesToIdentity } from "./identity";

const SEED_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const SEED_LENGTH = 55;
const SEED_SPACE_SIZE = BigInt(SEED_ALPHABET.length) ** BigInt(SEED_LENGTH);

function seedToBytes(seed: string): Uint8Array {
  if (seed.length !== SEED_LENGTH) {
    throw new Error("Seed must be 55 lowercase characters");
  }
  const bytes = new Uint8Array(seed.length);
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charAt(i);
    const idx = SEED_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error("Seed contains invalid character");
    bytes[i] = idx;
  }
  return bytes;
}

function base26BytesToBigInt(bytes: Uint8Array): bigint {
  const base = BigInt(SEED_ALPHABET.length);
  let multiplier = 1n;
  let value = 0n;
  for (const digit of bytes) {
    value += BigInt(digit) * multiplier;
    multiplier *= base;
  }
  return value;
}

function bigIntToBase26Bytes(value: bigint, length: number): Uint8Array {
  const base = BigInt(SEED_ALPHABET.length);
  const bytes = new Uint8Array(length);
  // Ensure value stays within the seed space range
  let remaining = ((value % SEED_SPACE_SIZE) + SEED_SPACE_SIZE) % SEED_SPACE_SIZE;
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(remaining % base);
    remaining /= base;
  }
  return bytes;
}

function applyAccountIndex(bytes: Uint8Array, accountIndex: number): Uint8Array {
  if (!accountIndex) {
    return bytes;
  }
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error("accountIndex must be a non-negative integer");
  }
  const baseValue = base26BytesToBigInt(bytes);
  const indexedValue = baseValue + BigInt(accountIndex);
  return bigIntToBase26Bytes(indexedValue, bytes.length);
}

async function derivePrivateKey(seed: string, accountIndex = 0) {
  const { K12 } = await cryptoPromise;
  const byteSeed = seedToBytes(seed);
  const indexedSeed = applyAccountIndex(byteSeed, accountIndex);
  const key = new Uint8Array(32);
  K12(indexedSeed, key, 32);
  return key;
}

export interface DeriveQubicWalletOptions {
  accountIndex?: number;
}

export async function deriveQubicWallet(seed: string, options: DeriveQubicWalletOptions = {}) {
  const crypto = await cryptoPromise;
  const privateKey = await derivePrivateKey(seed, options.accountIndex);
  const publicKey = crypto.schnorrq.generatePublicKey(privateKey);
  const identity = await publicKeyBytesToIdentity(publicKey);

  return {
    privateKeyHex: bytesToHex(privateKey),
    publicKeyHex: bytesToHex(publicKey),
    identity,
  };
}
