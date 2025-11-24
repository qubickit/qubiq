import { encodeTransaction } from "@serialization/transaction";
import { SchnorrTransactionSigner } from "./signer";
import type { UnsignedTransfer } from "./types";

export interface OfflineTransferBundle {
  createdAt: number;
  transfer: UnsignedTransfer;
  metadata?: Record<string, unknown>;
}

export interface CreateOfflineBundleOptions {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: bigint;
  tick: number;
  inputType?: number;
  inputData?: Uint8Array | string;
  metadata?: Record<string, unknown>;
}

export function createOfflineTransferBundle(
  options: CreateOfflineBundleOptions,
): OfflineTransferBundle {
  const transfer: UnsignedTransfer = {
    sourcePublicKey: options.sourcePublicKey,
    destinationPublicKey: options.destinationPublicKey,
    amount: options.amount,
    tick: options.tick,
    inputData:
      typeof options.inputData === "string"
        ? new TextEncoder().encode(options.inputData)
        : options.inputData,
    inputType: options.inputType ?? 0,
  };
  return {
    createdAt: Date.now(),
    transfer,
    metadata: options.metadata,
  };
}

export async function signOfflineTransferBundle(
  bundle: OfflineTransferBundle,
  privateKeyHex: string,
) {
  const signer = SchnorrTransactionSigner.fromPrivateKeyHex(
    privateKeyHex,
    bundle.transfer.sourcePublicKey,
  );
  const signed = await signer.signTransfer(bundle.transfer);
  const bytes = encodeTransaction({
    sourcePublicKey: signed.sourcePublicKey,
    destinationPublicKey: signed.destinationPublicKey,
    amount: signed.amount,
    tick: signed.tick,
    inputType: signed.inputType ?? 0,
    inputSize: signed.inputData?.length ?? 0,
    inputData: signed.inputData,
    signature: signed.signature,
  });
  return {
    signed,
    raw: bytes,
    bundle,
  };
}
