import type { Transaction } from "@types";

export interface UnsignedTransfer {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: bigint;
  tick: number;
  inputType?: number;
  inputData?: Uint8Array;
}

export type SignedTransfer = Transaction & {
  bytes: Uint8Array;
  digest: string;
};

export interface TransactionSigner {
  signTransfer(transfer: UnsignedTransfer): Promise<SignedTransfer>;
}
