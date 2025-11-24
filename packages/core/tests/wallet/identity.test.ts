import { expect, test } from "bun:test";

import { normalizePublicKeyHex } from "@wallet/identity";

const identity = "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK";
const expectedHex = "36af16d5265b7443d798891122b91a74893752107fe0286c45856bd793e339ff";

test("normalizePublicKeyHex accepts 32-byte hex", () => {
  const hex = "ab".repeat(32);
  expect(normalizePublicKeyHex(hex)).toBe(hex.toLowerCase());
});

test("normalizePublicKeyHex converts identity to public key hex", () => {
  expect(normalizePublicKeyHex(identity)).toBe(expectedHex);
});
