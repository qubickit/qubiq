import { bytesToHex, concatBytes, hexToBytes } from "@src/utils/bytes";
import type { Transaction } from "@types";
import { TransactionSchema } from "@types";

const PUBLIC_KEY_BYTES = 32;
const AMOUNT_BYTES = 8;
const TICK_BYTES = 4;
const INPUT_TYPE_BYTES = 2;
const INPUT_SIZE_BYTES = 2;
export const SIGNATURE_BYTES = 64;
export const TRANSACTION_HEADER_BYTES =
  PUBLIC_KEY_BYTES * 2 + AMOUNT_BYTES + TICK_BYTES + INPUT_TYPE_BYTES + INPUT_SIZE_BYTES;

export interface EncodableTransaction extends Omit<Transaction, "inputData" | "signature"> {
  inputData?: Uint8Array | string;
  signature: string | Uint8Array;
}

function ensureUint8Array(value?: Uint8Array | string): Uint8Array {
  if (!value) return new Uint8Array();
  if (typeof value === "string") {
    return hexToBytes(value);
  }
  return value;
}

export function encodeTransaction(tx: EncodableTransaction): Uint8Array {
  const parsed = TransactionSchema.parse({
    ...tx,
    inputData: tx.inputData instanceof Uint8Array ? tx.inputData : undefined,
    signature: typeof tx.signature === "string" ? tx.signature : bytesToHex(tx.signature),
  });

  const payload = ensureUint8Array(tx.inputData);
  const signatureBytes =
    tx.signature instanceof Uint8Array ? tx.signature : hexToBytes(tx.signature);

  if (signatureBytes.length !== SIGNATURE_BYTES) {
    throw new Error("Signature must be 64 bytes");
  }

  if (payload.length !== parsed.inputSize) {
    throw new Error("inputSize does not match inputData length");
  }

  const buffer = new ArrayBuffer(TRANSACTION_HEADER_BYTES);
  const view = new DataView(buffer);
  let offset = 0;

  const sourceBytes = hexToBytes(parsed.sourcePublicKey);
  const destinationBytes = hexToBytes(parsed.destinationPublicKey);
  new Uint8Array(buffer, offset, PUBLIC_KEY_BYTES).set(sourceBytes);
  offset += PUBLIC_KEY_BYTES;
  new Uint8Array(buffer, offset, PUBLIC_KEY_BYTES).set(destinationBytes);
  offset += PUBLIC_KEY_BYTES;

  view.setBigInt64(offset, parsed.amount, true);
  offset += AMOUNT_BYTES;
  view.setUint32(offset, parsed.tick, true);
  offset += TICK_BYTES;
  view.setUint16(offset, parsed.inputType, true);
  offset += INPUT_TYPE_BYTES;
  view.setUint16(offset, parsed.inputSize, true);

  return concatBytes(new Uint8Array(buffer), payload, signatureBytes);
}

export function decodeTransaction(bytes: Uint8Array): Transaction {
  if (bytes.length < TRANSACTION_HEADER_BYTES + SIGNATURE_BYTES) {
    throw new Error("Buffer too small to contain transaction");
  }

  const headerView = new DataView(bytes.buffer, bytes.byteOffset, TRANSACTION_HEADER_BYTES);
  let offset = 0;
  const source = bytes.slice(offset, offset + PUBLIC_KEY_BYTES);
  offset += PUBLIC_KEY_BYTES;
  const destination = bytes.slice(offset, offset + PUBLIC_KEY_BYTES);
  offset += PUBLIC_KEY_BYTES;

  const amount = headerView.getBigInt64(offset, true);
  offset += AMOUNT_BYTES;
  const tick = headerView.getUint32(offset, true);
  offset += TICK_BYTES;
  const inputType = headerView.getUint16(offset, true);
  offset += INPUT_TYPE_BYTES;
  const inputSize = headerView.getUint16(offset, true);

  const payloadStart = TRANSACTION_HEADER_BYTES;
  const payloadEnd = payloadStart + inputSize;
  if (bytes.length < payloadEnd + SIGNATURE_BYTES) {
    throw new Error("Buffer too small for payload + signature");
  }

  const payload = bytes.slice(payloadStart, payloadEnd);
  const signature = bytes.slice(payloadEnd, payloadEnd + SIGNATURE_BYTES);

  return TransactionSchema.parse({
    sourcePublicKey: bytesToHex(source),
    destinationPublicKey: bytesToHex(destination),
    amount,
    tick,
    inputType,
    inputSize,
    inputData: payload,
    signature: bytesToHex(signature),
  });
}
