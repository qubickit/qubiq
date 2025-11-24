import { expect, test } from "bun:test";

import { deriveWalletFromPath } from "@wallet/hd";
import { deriveWalletFromSeed } from "@wallet/wallet";

const seed = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";

test("deriveWalletFromPath computes deterministic offsets", async () => {
  const base = await deriveWalletFromSeed(seed);
  const account5 = await deriveWalletFromSeed(seed, { accountIndex: 5 });
  const pathWallet = await deriveWalletFromPath(seed, "m/5");

  expect(pathWallet.publicKey).toBe(account5.publicKey);
  expect(pathWallet.identity).not.toBe(base.identity);
});
