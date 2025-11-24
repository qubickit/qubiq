import { expect, test } from "bun:test";

import { DefaultWalletDeriver, deriveWalletFromSeed } from "@wallet/wallet";

const seed = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";
const expectedId = "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK";
const accountOneId = "VLMJHFOWVWVIUBEMPPEAKCWCWYNCCDSNIZODOCLHEDMKHGVUDDYHNNVFNQUM";
const accountOnePublic = "db37130a45c05e3d70b8a53ff61a5957803cb0b0ab72f96c8c8259bbfefba9c8";

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

test("deriveWalletFromSeed supports account indexes", async () => {
  const wallet = await deriveWalletFromSeed(seed, { accountIndex: 1 });
  expect(wallet.identity).toBe(accountOneId);
  expect(wallet.publicKey).toBe(accountOnePublic);
});
