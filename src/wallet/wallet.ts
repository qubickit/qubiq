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

export interface WalletDeriver {
  derive(seed: string): Promise<Omit<WalletKeys, "seed">>;
}

export class DefaultWalletDeriver implements WalletDeriver {
  async derive(seed: string): Promise<Omit<WalletKeys, "seed">> {
    const result = await deriveQubicWallet(seed);
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

export async function deriveWalletFromSeed(
  seed: string,
  deriver: WalletDeriver = defaultDeriver,
): Promise<WalletKeys> {
  const normalizedSeed = normalizeSeed(seed);
  const keys = await deriver.derive(normalizedSeed);
  return {
    seed: normalizedSeed,
    ...keys,
  };
}

export interface CreateWalletOptions {
  deriver?: WalletDeriver;
  signer?: TransactionSigner;
}

export async function createWalletFromSeed(
  seed: string,
  options: CreateWalletOptions = {},
): Promise<Wallet> {
  const keys = await deriveWalletFromSeed(seed, options.deriver ?? defaultDeriver);
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
