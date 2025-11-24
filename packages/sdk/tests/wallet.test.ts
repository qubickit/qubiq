import { describe, expect, test } from "bun:test";
import { resolveWallet, createWalletTools } from "../src/index";

const SEED = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";

describe("wallet helpers", () => {
  test("resolveWallet derives guardrails", async () => {
    const resolution = await resolveWallet({ seed: SEED, minTickOffset: 10, maxTickOffset: 20 });
    expect(resolution?.guardrails.minTickOffset).toBe(10);
    expect(resolution?.guardrails.maxTickOffset).toBe(20);
  });

  test("createWalletTools encrypts/decrypts seeds", async () => {
    const resolution = await resolveWallet({ seed: SEED });
    const tools = resolution ? createWalletTools(resolution) : undefined;
    expect(tools).toBeDefined();
    if (tools) {
      const encrypted = tools.encrypt(SEED, "pass");
      const decrypted = tools.decrypt(encrypted, "pass");
      expect(decrypted).toBe(SEED);
    }
  });
});
