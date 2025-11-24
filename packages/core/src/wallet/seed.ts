import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";

export type SeedEncoding = "hex" | "base64";

export interface GenerateSeedOptions {
  size?: number;
  encoding?: SeedEncoding;
}

const DEFAULT_SEED_SIZE = 32;

export function generateSeed(options: GenerateSeedOptions = {}): string {
  const size = options.size ?? DEFAULT_SEED_SIZE;
  const encoding = options.encoding ?? "hex";
  const buffer =
    typeof randomBytes === "function"
      ? randomBytes(size)
      : Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(size)));
  return buffer.toString(encoding);
}

export function normalizeSeed(seed: string): string {
  return seed.trim();
}
