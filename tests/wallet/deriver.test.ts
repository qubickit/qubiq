import { expect, test } from "bun:test";

import { DefaultWalletDeriver, deriveWalletFromSeed } from "@wallet/wallet";

const seed = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";
const expectedId = "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK";

test("DefaultWalletDeriver derives deterministic keys", async () => {
  const deriver = new DefaultWalletDeriver();
  const keys = await deriver.derive(seed);
  const keysAgain = await deriver.derive(seed);
  expect(keys.identity).toBe(expectedId);
  expect(keys.identity).toBe(keysAgain.identity);
  expect(keys.publicKey).toHaveLength(64);
  expect(keys.privateKey).toHaveLength(64);
});

test("deriveWalletFromSeed uses default deriver", async () => {
  const wallet = await deriveWalletFromSeed(seed);
  expect(wallet.identity).toBe(expectedId);
});
