import { expect, test } from "bun:test";

import { decodeTransaction, encodeTransaction, SIGNATURE_BYTES } from "@serialization/transaction";
import { bytesToHex } from "@src/utils/bytes";
import { TransactionSchema } from "@types";

const sampleTx = TransactionSchema.parse({
  sourcePublicKey: "ab".repeat(32),
  destinationPublicKey: "cd".repeat(32),
  amount: BigInt(42),
  tick: 100,
  inputType: 2,
  inputSize: 3,
  inputData: new Uint8Array([1, 2, 3]),
  signature: "ef".repeat(64),
});

test("encodeTransaction produces deterministic byte layout", () => {
  const encoded = encodeTransaction(sampleTx);
  expect(encoded.length).toBe(SIGNATURE_BYTES + sampleTx.inputSize + 80);
  const roundtrip = decodeTransaction(encoded);
  expect(roundtrip.sourcePublicKey).toBe(sampleTx.sourcePublicKey);
  expect(bytesToHex(roundtrip.inputData ?? new Uint8Array())).toBe("010203");
});

test("decodeTransaction rejects short buffers", () => {
  expect(() => decodeTransaction(new Uint8Array(10))).toThrow();
});
