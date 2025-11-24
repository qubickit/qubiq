import type { EncryptedSecret, Wallet } from "@qubiq/core";
import {
  Wallet as CoreWallet,
  SchnorrTransactionSigner,
  createWalletFromSeed,
  decryptSecret,
  deriveWalletFromPath,
  encryptSecret,
} from "@qubiq/core";

export interface WalletConfig {
  seed?: string;
  encryptedSeed?: EncryptedSecret;
  passphrase?: string;
  hdPath?: string;
  minTickOffset?: number;
  maxTickOffset?: number;
}

export interface GuardrailConfig {
  minTickOffset: number;
  maxTickOffset: number;
}

export interface WalletResolution {
  wallet: Wallet;
  guardrails: GuardrailConfig;
  seed?: string;
}

export interface WalletTools {
  encrypt(seed: string, password: string, iterations?: number): EncryptedSecret;
  decrypt(payload: EncryptedSecret, password: string): string;
  derivePath(path: string): Promise<Wallet>;
  getSeed(): string | undefined;
}

export interface ResolveWalletOptions {
  wallet?: Wallet;
  walletConfig?: WalletConfig;
  seed?: string;
  encryptedSeed?: EncryptedSecret;
  passphrase?: string;
  hdPath?: string;
  minTickOffset?: number;
  maxTickOffset?: number;
}

export const DEFAULT_TICK_OFFSET = 10;
export const DEFAULT_MIN_TICK_OFFSET = 5;
export const DEFAULT_MAX_TICK_OFFSET = 120;

export async function resolveWallet(options: ResolveWalletOptions): Promise<WalletResolution | undefined> {
  if (options.wallet) {
    return {
      wallet: options.wallet,
      guardrails: extractGuardrails(options.walletConfig ?? options),
      seed: undefined,
    };
  }

  const config: WalletConfig | undefined = options.walletConfig ?? {
    seed: options.seed,
    encryptedSeed: options.encryptedSeed,
    passphrase: options.passphrase,
    hdPath: options.hdPath,
    minTickOffset: options.minTickOffset,
    maxTickOffset: options.maxTickOffset,
  };

  if (!config) {
    return undefined;
  }

  let seed = config.seed;
  if (!seed && config.encryptedSeed && config.passphrase) {
    seed = decryptSecret(config.encryptedSeed, config.passphrase);
  }

  if (!seed) {
    return undefined;
  }

  const wallet = config.hdPath
    ? await createWalletFromPath(seed, config.hdPath)
    : await createWalletFromSeed(seed);

  return {
    wallet,
    guardrails: extractGuardrails(config),
    seed,
  };
}

export function createWalletTools(resolution: WalletResolution): WalletTools | undefined {
  if (!resolution.seed) {
    return undefined;
  }
  const seed = resolution.seed;
  return {
    encrypt: (value, password, iterations) => encryptSecret(value, password, iterations),
    decrypt: (payload, password) => decryptSecret(payload, password),
    derivePath: (path: string) => createWalletFromPath(seed, path),
    getSeed: () => seed,
  } satisfies WalletTools;
}

export function encryptWalletSeed(seed: string, password: string, iterations?: number) {
  return encryptSecret(seed, password, iterations);
}

export function decryptWalletSeed(payload: EncryptedSecret, password: string) {
  return decryptSecret(payload, password);
}

export function extractGuardrails(input?: { minTickOffset?: number; maxTickOffset?: number }): GuardrailConfig {
  const rawMin = input?.minTickOffset ?? DEFAULT_MIN_TICK_OFFSET;
  const rawMax = input?.maxTickOffset ?? DEFAULT_MAX_TICK_OFFSET;
  const normalizedMin = clamp(rawMin, DEFAULT_MIN_TICK_OFFSET, rawMax);
  const normalizedMax = Math.max(rawMax, normalizedMin);
  return {
    minTickOffset: normalizedMin,
    maxTickOffset: clamp(normalizedMax, normalizedMin, DEFAULT_MAX_TICK_OFFSET),
  } satisfies GuardrailConfig;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function createWalletFromPath(seed: string, path: string) {
  const keys = await deriveWalletFromPath(seed, path);
  const signer = SchnorrTransactionSigner.fromPrivateKeyHex(keys.privateKey, keys.publicKey);
  return new CoreWallet(keys, signer);
}
