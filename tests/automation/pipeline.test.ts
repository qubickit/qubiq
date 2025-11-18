import { expect, mock, test } from "bun:test";

import { AutomationPipeline } from "@automation/pipeline";
import type { TransactionQueueRetryEvent } from "@automation/transactionQueue";
import { TransactionQueue } from "@automation/transactionQueue";
import type { AutomationJob } from "@automation/types";
import { createWalletFromSeed } from "@wallet/wallet";

const seed = "wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("AutomationPipeline executes tasks on intervals", async () => {
  const runs: Array<string> = [];
  const job: AutomationJob = async () => {
    runs.push("tick");
  };
  const pipeline = new AutomationPipeline();
  pipeline.addTask({
    name: "test",
    job,
    intervalMs: 10,
    runOnStart: true,
  });

  await pipeline.start();
  await delay(35);
  await pipeline.stop();

  expect(runs.length).toBeGreaterThanOrEqual(2);
});

test("TransactionQueue processes items sequentially", async () => {
  const wallet = await createWalletFromSeed(seed);
  const getTickInfo = mock(async () => ({
    tickInfo: { tick: 100, duration: 1000, epoch: 1, initialTick: 0 },
  }));
  const broadcastTransaction = mock(async () => ({
    transactionId: crypto.randomUUID(),
  }));

  const queue = new TransactionQueue({
    wallet,
    client: {
      getTickInfo,
      broadcastTransaction,
    },
    defaultTickOffset: 5,
  });

  queue.enqueue({
    destinationPublicKey: wallet.publicKey,
    amount: BigInt(1),
  });
  queue.enqueue({
    destinationPublicKey: wallet.publicKey,
    amount: BigInt(2),
    tickOffset: 7,
  });

  await queue.waitForIdle();
  expect(getTickInfo.mock.calls.length).toBe(2);
  expect(broadcastTransaction.mock.calls.length).toBe(2);
});

test("TransactionQueue retries failed broadcasts", async () => {
  const wallet = await createWalletFromSeed(seed);
  const getTickInfo = mock(async () => ({
    tickInfo: { tick: 200, duration: 1000, epoch: 2, initialTick: 0 },
  }));
  let attempts = 0;
  const broadcastTransaction = mock(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("network");
    }
    return { transactionId: crypto.randomUUID() };
  });

  const queue = new TransactionQueue({
    wallet,
    client: { getTickInfo, broadcastTransaction },
    retryDelayMs: 20,
    maxAttempts: 2,
  });

  const retryEvents: TransactionQueueRetryEvent[] = [];
  queue.addRetryListener((event) => retryEvents.push(event));

  queue.enqueue({
    destinationPublicKey: wallet.publicKey,
    amount: BigInt(3),
  });

  await queue.waitForIdle();
  expect(retryEvents.length).toBe(1);
  expect(broadcastTransaction.mock.calls.length).toBe(2);
});
