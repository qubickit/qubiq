import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import {
  decodeTransaction,
  type EncodableTransaction,
  encodeTransaction,
  SIGNATURE_BYTES,
} from "@serialization/transaction";

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function randomTransaction(): EncodableTransaction {
  const inputSize = Math.floor(Math.random() * 32);
  const inputData = randomBytes(inputSize);
  const signature = randomBytes(SIGNATURE_BYTES);
  return {
    sourcePublicKey: randomHex(32),
    destinationPublicKey: randomHex(32),
    amount: BigInt(Math.floor(Math.random() * 1_000_000)),
    tick: Math.floor(Math.random() * 10_000),
    inputType: Math.floor(Math.random() * 255),
    inputSize,
    inputData,
    signature,
  };
}

test("transaction encode/decode fuzz", () => {
  const iterations = 200;
  for (let i = 0; i < iterations; i++) {
    const tx = randomTransaction();
    const bytes = encodeTransaction(tx);
    const decoded = decodeTransaction(bytes);
    expect(decoded.sourcePublicKey).toBe(tx.sourcePublicKey.toLowerCase());
    expect(decoded.destinationPublicKey).toBe(tx.destinationPublicKey.toLowerCase());
    expect(decoded.amount).toBe(tx.amount);
    expect(decoded.tick).toBe(tx.tick);
    expect(decoded.inputSize).toBe(tx.inputSize);
    expect(decoded.signature).toBe(Buffer.from(tx.signature).toString("hex"));
  }
});

test("transaction fuzz rejects inconsistent payload", () => {
  const tx = randomTransaction();
  tx.inputSize += 1;
  expect(() => encodeTransaction(tx)).toThrow("inputSize");
});
