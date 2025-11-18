import { expect, test } from "bun:test";

import { decryptSecret, encryptSecret } from "@wallet/secureStorage";

test("secure storage encrypts/decrypts seeds", () => {
  const secret = "test-secret";
  const password = "strong-password";
  const payload = encryptSecret(secret, password);
  const plaintext = decryptSecret(payload, password);
  expect(plaintext).toBe(secret);
});
