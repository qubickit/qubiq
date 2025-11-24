import { describe, expect, test } from "bun:test";
import { prepareSignedTransfer } from "../src/index";
import type { LiveServiceClient, Wallet } from "@qubiq/core";

const wallet = {
  signTransfer: async () => ({
    bytes: new Uint8Array([1, 2, 3]),
    transactionId: "id",
    destinationPublicKey: "",
    sourcePublicKey: "",
    signature: "",
    digest: "",
    amount: 1n,
    tick: 1,
  }),
} as unknown as Wallet;

const liveClient = {
  async getTickInfo() {
    return { tickInfo: { tick: 100 } };
  },
} as LiveServiceClient;

describe("transfers", () => {
  test("prepareSignedTransfer enforces amount", async () => {
    await expect(
      prepareSignedTransfer(wallet, liveClient, {
        destination: "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
        amount: 1,
      }),
    ).resolves.toBeDefined();
  });
});
