import { expect, mock, test } from "bun:test";
import { BalanceMonitor } from "@monitoring/balanceMonitor";
import type { BalanceResponse } from "@types";

function createBalance(amount: string): BalanceResponse {
  return {
    balance: {
      id: "A".repeat(60),
      balance: amount,
      validForTick: 1,
      latestIncomingTransferTick: 1,
      latestOutgoingTransferTick: 0,
      incomingAmount: amount,
      outgoingAmount: "0",
      numberOfIncomingTransfers: 1,
      numberOfOutgoingTransfers: 0,
    },
  };
}

test("BalanceMonitor emits delta samples", async () => {
  const balances = [createBalance("10"), createBalance("15")];
  const client = {
    getBalance: mock(async () => balances.shift() ?? createBalance("15")),
  };

  const monitor = new BalanceMonitor({
    client,
    identities: ["A".repeat(60)],
    intervalMs: 10,
  });

  const samplePromise = new Promise((resolve) => {
    monitor.on("sample", (sample) => {
      if (sample.delta !== 0n) {
        resolve(sample);
      }
    });
  });

  monitor.start();
  const sample = (await samplePromise) as { delta: bigint };
  monitor.stop();

  expect(sample.delta).toBe(5n);
  expect(client.getBalance.mock.calls.length).toBeGreaterThanOrEqual(2);
});
