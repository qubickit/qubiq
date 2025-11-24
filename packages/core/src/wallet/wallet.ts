import type { DeriveQubicWalletOptions } from "./deriver";
import { deriveQubicWallet } from "./deriver";
import { normalizeSeed } from "./seed";
import { SchnorrTransactionSigner } from "./signer";
import type { SignedTransfer, TransactionSigner, UnsignedTransfer } from "./types";

export interface WalletKeys {
  seed: string;
  identity: string;
  publicKey: string;
  privateKey: string;
}

export interface WalletDeriveParams extends DeriveQubicWalletOptions {}

export interface WalletDeriver {
  derive(seed: string, params?: WalletDeriveParams): Promise<Omit<WalletKeys, "seed">>;
}

export class DefaultWalletDeriver implements WalletDeriver {
  async derive(seed: string, params?: WalletDeriveParams): Promise<Omit<WalletKeys, "seed">> {
    const result = await deriveQubicWallet(seed, params);
    return {
      identity: result.identity,
      publicKey: result.publicKeyHex,
      privateKey: result.privateKeyHex,
    };
  }
}

let defaultDeriver: WalletDeriver = new DefaultWalletDeriver();

export function setDefaultWalletDeriver(deriver: WalletDeriver) {
  defaultDeriver = deriver;
}

export interface DeriveWalletOptions extends WalletDeriveParams {
  deriver?: WalletDeriver;
}

export interface CreateWalletOptions extends DeriveWalletOptions {
  signer?: TransactionSigner;
}

export async function deriveWalletFromSeed(
  seed: string,
  options: DeriveWalletOptions = {},
): Promise<WalletKeys> {
  const normalizedSeed = normalizeSeed(seed);
  const { deriver = defaultDeriver, ...params } = options;
  const keys = await deriver.derive(normalizedSeed, params);
  return {
    seed: normalizedSeed,
    ...keys,
  };
}

export async function createWalletFromSeed(
  seed: string,
  options: CreateWalletOptions = {},
): Promise<Wallet> {
  const keys = await deriveWalletFromSeed(seed, options);
  const signer =
    options.signer ?? SchnorrTransactionSigner.fromPrivateKeyHex(keys.privateKey, keys.publicKey);
  return new Wallet(keys, signer);
}

export class Wallet {
  constructor(
    private readonly keys: WalletKeys,
    private readonly signer: TransactionSigner,
  ) {}

  get identity(): string {
    return this.keys.identity;
  }

  get publicKey(): string {
    return this.keys.publicKey;
  }

  get privateKey(): string {
    return this.keys.privateKey;
  }

  get seed(): string {
    return this.keys.seed;
  }

  async signTransfer(transfer: Omit<UnsignedTransfer, "sourcePublicKey">): Promise<SignedTransfer> {
    return this.signer.signTransfer({
      ...transfer,
      sourcePublicKey: this.keys.publicKey,
    });
  }
}
