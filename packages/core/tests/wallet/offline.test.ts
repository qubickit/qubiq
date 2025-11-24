import { expect, test } from "bun:test";

import { createOfflineTransferBundle, signOfflineTransferBundle } from "@wallet/offline";
import { deriveWalletFromSeed } from "@wallet/wallet";

test("offline bundle signs transfer", async () => {
  const wallet = await deriveWalletFromSeed(
    "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt",
  );

  const bundle = createOfflineTransferBundle({
    sourcePublicKey: wallet.publicKey,
    destinationPublicKey: wallet.publicKey,
    amount: BigInt(123),
    tick: 100,
  });

  const { signed, raw } = await signOfflineTransferBundle(bundle, wallet.privateKey);
  expect(signed.signature).toHaveLength(128);
  expect(raw.length).toBeGreaterThan(0);
});
