import { expect, mock, test } from "bun:test";
import { TickMonitor } from "@monitoring/tickMonitor";
import type { TickInfoResponse } from "@types";

function createTickInfo(tick: number): TickInfoResponse {
  return {
    tickInfo: {
      tick,
      duration: 1000,
      epoch: 42,
      initialTick: 0,
    },
  };
}

test("TickMonitor emits samples with delta", async () => {
  const tickSequence = [createTickInfo(100), createTickInfo(101)];
  const client = {
    getTickInfo: mock(async () => tickSequence.shift() ?? createTickInfo(101)),
  };

  const monitor = new TickMonitor({ client, intervalMs: 10 });

  const samplePromise = new Promise((resolve) => {
    monitor.on("sample", (sample) => {
      if (sample.deltaTick >= 0) {
        resolve(sample);
      }
    });
  });

  monitor.start();
  const sample = (await samplePromise) as { tick: number; deltaTick: number };
  monitor.stop();

  expect(sample.tick).toBeGreaterThanOrEqual(100);
  expect(sample.deltaTick).toBeGreaterThanOrEqual(0);
  expect(client.getTickInfo.mock.calls.length).toBeGreaterThanOrEqual(1);
});
