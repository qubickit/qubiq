import cryptoPromise from "@crypto/qubic/index.js";
import { QubicDefinitions } from "@crypto/qubic/QubicDefinitions";
import {
  AMOUNT_BYTES,
  INPUT_SIZE_BYTES,
  INPUT_TYPE_BYTES,
  PUBLIC_KEY_BYTES,
  TICK_BYTES,
  TRANSACTION_HEADER_BYTES,
} from "@serialization/transaction";
import { bytesToHex, concatBytes, hexToBytes } from "@src/utils/bytes";
import type { Transaction } from "@types";
import { TransactionSchema } from "@types";
import { normalizePublicKeyHex } from "./identity";
import type { SignedTransfer, TransactionSigner, UnsignedTransfer } from "./types";

interface NormalizedTransfer extends UnsignedTransfer {
  inputType: number;
  payload: Uint8Array;
}

export class SchnorrTransactionSigner implements TransactionSigner {
  constructor(
    private readonly privateKey: Uint8Array,
    private readonly publicKey: Uint8Array,
  ) {}

  static fromPrivateKeyHex(privateKeyHex: string, publicKeyHex: string) {
    return new SchnorrTransactionSigner(hexToBytes(privateKeyHex), hexToBytes(publicKeyHex));
  }

  async signTransfer(transfer: UnsignedTransfer): Promise<SignedTransfer> {
    const normalized = this.normalizeTransfer(transfer);
    const unsignedBytes = this.encodeUnsignedTransaction(normalized);
    const crypto = await cryptoPromise;

    const digest = new Uint8Array(QubicDefinitions.DIGEST_LENGTH);
    crypto.K12(unsignedBytes, digest, QubicDefinitions.DIGEST_LENGTH);

    const signatureBytes = crypto.schnorrq.sign(this.privateKey, this.publicKey, digest);
    const signedBytes = concatBytes(unsignedBytes, signatureBytes);

    const signedDigest = new Uint8Array(QubicDefinitions.DIGEST_LENGTH);
    crypto.K12(signedBytes, signedDigest, QubicDefinitions.DIGEST_LENGTH);

    const transaction = this.buildTransaction(normalized, signatureBytes);

    return {
      ...transaction,
      bytes: signedBytes,
      digest: bytesToHex(signedDigest),
    };
  }

  private normalizeTransfer(transfer: UnsignedTransfer): NormalizedTransfer {
    return {
      ...transfer,
      sourcePublicKey: normalizePublicKeyHex(transfer.sourcePublicKey),
      destinationPublicKey: normalizePublicKeyHex(transfer.destinationPublicKey),
      inputType: transfer.inputType ?? 0,
      payload: transfer.inputData ?? new Uint8Array(),
    };
  }

  private buildTransaction(normalized: NormalizedTransfer, signature: Uint8Array): Transaction {
    return TransactionSchema.parse({
      sourcePublicKey: normalized.sourcePublicKey,
      destinationPublicKey: normalized.destinationPublicKey,
      amount: normalized.amount,
      tick: normalized.tick,
      inputType: normalized.inputType,
      inputSize: normalized.payload.length,
      inputData: normalized.payload,
      signature: bytesToHex(signature),
    });
  }

  private encodeUnsignedTransaction(normalized: NormalizedTransfer): Uint8Array {
    if (normalized.payload.length > 0xffff) {
      throw new Error("Payload too large (max 65535 bytes)");
    }

    const header = new ArrayBuffer(TRANSACTION_HEADER_BYTES);
    const view = new DataView(header);
    let offset = 0;

    const sourceBytes = hexToBytes(normalized.sourcePublicKey);
    if (sourceBytes.length !== PUBLIC_KEY_BYTES) {
      throw new Error("sourcePublicKey must be 32 bytes");
    }
    new Uint8Array(header, offset, PUBLIC_KEY_BYTES).set(sourceBytes);
    offset += PUBLIC_KEY_BYTES;

    const destinationBytes = hexToBytes(normalized.destinationPublicKey);
    if (destinationBytes.length !== PUBLIC_KEY_BYTES) {
      throw new Error("destinationPublicKey must be 32 bytes");
    }
    new Uint8Array(header, offset, PUBLIC_KEY_BYTES).set(destinationBytes);
    offset += PUBLIC_KEY_BYTES;

    view.setBigInt64(offset, normalized.amount, true);
    offset += AMOUNT_BYTES;

    view.setUint32(offset, normalized.tick, true);
    offset += TICK_BYTES;

    view.setUint16(offset, normalized.inputType, true);
    offset += INPUT_TYPE_BYTES;

    view.setUint16(offset, normalized.payload.length, true);
    offset += INPUT_SIZE_BYTES;

    if (offset !== TRANSACTION_HEADER_BYTES) {
      throw new Error("Transaction header size mismatch");
    }

    return concatBytes(new Uint8Array(header), normalized.payload);
  }
}
