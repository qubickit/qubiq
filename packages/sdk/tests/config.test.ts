import { describe, expect, test } from "bun:test";
import { loadQubiQSdkConfig, resolveSdkConfig } from "../src/index";
import { writeFile, unlink } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP_DIR = mkdtempSync(join(tmpdir(), "qubiq-sdk-test-"));

describe("config loader", () => {
  test("substitutes env tokens", async () => {
    const path = join(TMP_DIR, "qubiq.config.json");
    await writeFile(path, JSON.stringify({ wallet: { seed: "${ENV:TEST_SEED}" } }));
    const options = await loadQubiQSdkConfig(path, { env: { TEST_SEED: "seed" } });
    expect(options.walletConfig?.seed).toBe("seed");
    await unlink(path);
  });

  test("resolveSdkConfig merges overrides", () => {
    const resolved = resolveSdkConfig({ wallet: { seed: "abc" } }, { TEST: "seed" });
    expect(resolved.walletConfig?.seed).toBe("abc");
  });
});
