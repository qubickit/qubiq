import { expect, test } from "bun:test";

import { BootManager } from "@boot/bootManager";
import { BootMode, type BootState, type BootStateStore } from "@boot/types";
import type { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { QueryServiceClient } from "@clients/http/queryServiceClient";
import type { QueryServiceTickResponse, TickInfoResponse } from "@types";

class MemoryStore implements BootStateStore {
  private state?: BootState;
  async load(): Promise<BootState | undefined> {
    return this.state;
  }
  async save(state: BootState): Promise<void> {
    this.state = state;
  }
}

class MockLiveClient {
  constructor(private readonly epoch: number) {}
  async getTickInfo(): Promise<TickInfoResponse> {
    return {
      tickInfo: {
        tick: 1,
        duration: 1000,
        epoch: this.epoch,
        initialTick: 0,
      },
    };
  }
}

class MockQueryClient {
  constructor(private readonly epoch: number) {}
  async getLastProcessedTick(): Promise<QueryServiceTickResponse> {
    return {
      tickNumber: 1,
      epoch: this.epoch,
      intervalInitialTick: 0,
    };
  }
}

test("BootManager defaults to scratch when no state", async () => {
  const store = new MemoryStore();
  const manager = new BootManager({
    stateStore: store,
    liveClient: new MockLiveClient(10) as unknown as LiveServiceClient,
    queryClient: new MockQueryClient(10) as unknown as QueryServiceClient,
  });

  const decision = await manager.decide();
  expect(decision.mode).toBe(BootMode.Scratch);
  expect(decision.flag).toBe(1);
});

test("BootManager picks seamless when epochs align", async () => {
  const store = new MemoryStore();
  await store.save({ epoch: 10, mode: BootMode.Seamless, timestamp: Date.now() });
  const manager = new BootManager({
    stateStore: store,
    liveClient: new MockLiveClient(11) as unknown as LiveServiceClient,
    queryClient: new MockQueryClient(11) as unknown as QueryServiceClient,
  });

  const decision = await manager.decide();
  expect(decision.mode).toBe(BootMode.Seamless);
  expect(decision.flag).toBe(0);
});

test("BootManager respects forced mode", async () => {
  const store = new MemoryStore();
  const manager = new BootManager({
    stateStore: store,
    liveClient: new MockLiveClient(0) as unknown as LiveServiceClient,
    queryClient: new MockQueryClient(0) as unknown as QueryServiceClient,
  });

  const decision = await manager.decide({ forcedMode: BootMode.Seamless, desiredEpoch: 5 });
  expect(decision.mode).toBe(BootMode.Seamless);
  expect(decision.epoch).toBe(5);
});
