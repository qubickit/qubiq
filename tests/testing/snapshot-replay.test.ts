import { expect, test } from "bun:test";

import type { TickSnapshot, TransactionSnapshot } from "@testing";
import {
  HistoricalTickSnapshots,
  HistoricalTransactionSnapshots,
  replayTickSnapshots,
  replayTransactionSnapshots,
} from "@testing";

test("replayTickSnapshots iterates through fixtures", async () => {
  const seen: number[] = [];
  await replayTickSnapshots(HistoricalTickSnapshots, async (snapshot: TickSnapshot) => {
    seen.push(snapshot.tick);
  });
  expect(seen).toEqual(HistoricalTickSnapshots.map((snapshot) => snapshot.tick));
});

test("replayTransactionSnapshots loops with delay", async () => {
  const seen: string[] = [];
  const controller = new AbortController();

  const replay = replayTransactionSnapshots(
    HistoricalTransactionSnapshots,
    async (snapshot: TransactionSnapshot) => {
      seen.push(snapshot.hash);
      if (seen.length === 3) {
        controller.abort();
      }
    },
    { loop: true, delayMs: 1, signal: controller.signal },
  );

  await expect(replay).resolves.toBeUndefined();
  expect(seen.length).toBeGreaterThanOrEqual(3);
});
