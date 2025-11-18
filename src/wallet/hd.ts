import type { DeriveWalletOptions, WalletKeys } from "./wallet";
import { deriveWalletFromSeed } from "./wallet";

const PATH_REGEX = /^m(\/[0-9]+'?)*$/;

function parsePath(path: string): number[] {
  if (!PATH_REGEX.test(path)) {
    throw new Error("Invalid derivation path");
  }
  const segments = path.split("/").slice(1);
  return segments.map((segment) => {
    const hardened = segment.endsWith("'");
    const value = Number.parseInt(segment.replace("'", ""), 10);
    if (Number.isNaN(value)) {
      throw new Error("Invalid derivation path segment");
    }
    return hardened ? value + 0x80000000 : value;
  });
}

function accumulateIndex(segments: number[]): number {
  let index = 0;
  for (const segment of segments) {
    index = index * 0x1000 + segment;
    if (!Number.isSafeInteger(index)) {
      throw new Error("Derivation path produces index larger than Number.MAX_SAFE_INTEGER");
    }
  }
  return index;
}

export interface DeriveWalletFromPathOptions extends Omit<DeriveWalletOptions, "accountIndex"> {}

export function deriveWalletFromPath(
  seed: string,
  path: string,
  options: DeriveWalletFromPathOptions = {},
): Promise<WalletKeys> {
  const segments = parsePath(path);
  const accountIndex = accumulateIndex(segments);
  return deriveWalletFromSeed(seed, { ...options, accountIndex });
}
