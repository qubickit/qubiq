import { normalizeSeed } from "./seed";

export interface WalletKeys {
  seed: string;
  identity: string;
  publicKey: string;
  privateKey: string;
}

export interface WalletDeriver {
  derive(seed: string): Promise<Omit<WalletKeys, "seed">>;
}

const NOT_IMPLEMENTED_MESSAGE =
  "No wallet derivation adapter configured. Provide a WalletDeriver that matches the official Qubic identity scheme.";

export class NotImplementedDeriver implements WalletDeriver {
  async derive(): Promise<Omit<WalletKeys, "seed">> {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  }
}

let defaultDeriver: WalletDeriver = new NotImplementedDeriver();

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

export interface UnsignedTransfer {
  source: string;
  destination: string;
  amount: bigint;
  tick: number;
  payload?: Uint8Array;
}

export interface SignedTransfer extends UnsignedTransfer {
  signature: string;
}

export interface TransactionSigner {
  signTransfer(transfer: UnsignedTransfer): Promise<SignedTransfer>;
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

  async signTransfer(transfer: Omit<UnsignedTransfer, "source">): Promise<SignedTransfer> {
    return this.signer.signTransfer({
      ...transfer,
      source: this.keys.identity,
    });
  }
}
