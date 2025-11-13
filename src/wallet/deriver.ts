import cryptoPromise from "@crypto/qubic/index.js";
import { QubicDefinitions } from "@crypto/qubic/QubicDefinitions";
import { bytesToHex } from "@src/utils/bytes";
import BigNumber from "bignumber.js";

const SEED_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const IDENTITY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PUBLIC_KEY_CHUNK = 8;
const CHARS_PER_CHUNK = 14;

function seedToBytes(seed: string): Uint8Array {
  if (seed.length !== 55) {
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

async function getChecksum(crypto: Awaited<typeof cryptoPromise>, publicKey: Uint8Array) {
  const digest = new Uint8Array(QubicDefinitions.DIGEST_LENGTH);
  crypto.K12(publicKey, digest, QubicDefinitions.DIGEST_LENGTH);
  return digest.slice(0, 3);
}

async function getIdentity(
  crypto: Awaited<typeof cryptoPromise>,
  publicKey: Uint8Array,
): Promise<string> {
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

  const checksum = await getChecksum(crypto, publicKey);
  const c0 = checksum[0] ?? 0;
  const c1 = checksum[1] ?? 0;
  const c2 = checksum[2] ?? 0;
  let checksumValue = ((c2 << 16) | (c1 << 8) | c0) & 0x3ffff;
  for (let i = 0; i < 4; i++) {
    identity += String.fromCharCode((checksumValue % 26) + IDENTITY_ALPHABET.charCodeAt(0));
    checksumValue = Math.floor(checksumValue / 26);
  }

  return identity;
}

async function derivePrivateKey(seed: string) {
  const { K12 } = await cryptoPromise;
  const byteSeed = seedToBytes(seed);
  const preimage = byteSeed.slice();
  const key = new Uint8Array(32);
  K12(preimage, key, 32);
  return key;
}

export async function deriveQubicWallet(seed: string) {
  const crypto = await cryptoPromise;
  const privateKey = await derivePrivateKey(seed);
  const publicKey = crypto.schnorrq.generatePublicKey(privateKey);
  const identity = await getIdentity(crypto, publicKey);

  return {
    privateKeyHex: bytesToHex(privateKey),
    publicKeyHex: bytesToHex(publicKey),
    identity,
  };
}
