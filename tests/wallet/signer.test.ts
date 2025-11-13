import { expect, test } from "bun:test";

import cryptoPromise from "@crypto/qubic/index.js";
import { QubicDefinitions } from "@crypto/qubic/QubicDefinitions";
import { encodeTransaction, SIGNATURE_BYTES } from "@serialization/transaction";
import { hexToBytes } from "@src/utils/bytes";
import { SchnorrTransactionSigner } from "@wallet/signer";
import { deriveWalletFromSeed } from "@wallet/wallet";

const seed = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";

test("SchnorrTransactionSigner produces canonical bytes and valid signatures", async () => {
  const keys = await deriveWalletFromSeed(seed);
  const signer = SchnorrTransactionSigner.fromPrivateKeyHex(keys.privateKey, keys.publicKey);

  const signed = await signer.signTransfer({
    sourcePublicKey: keys.publicKey,
    destinationPublicKey: keys.identity,
    amount: BigInt(123),
    tick: 42,
  });

  expect(signed.signature).toHaveLength(128);
  expect(signed.bytes).toEqual(encodeTransaction(signed));

  const unsignedBytes = signed.bytes.slice(0, signed.bytes.length - SIGNATURE_BYTES);
  const signatureBytes = signed.bytes.slice(-SIGNATURE_BYTES);
  const crypto = await cryptoPromise;
  const digest = new Uint8Array(QubicDefinitions.DIGEST_LENGTH);
  crypto.K12(unsignedBytes, digest, QubicDefinitions.DIGEST_LENGTH);
  const verified = crypto.schnorrq.verify(hexToBytes(keys.publicKey), digest, signatureBytes);
  expect(verified).toBe(1);
});
