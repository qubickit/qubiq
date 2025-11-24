import type {
  BalanceSnapshot,
  CcfProposalFetchResult,
  TickSample,
  WalletWatcherEventMap,
} from "@qubiq/core";

export type AutomationEvent =
  | { type: "balance.snapshot"; snapshots: BalanceSnapshot[] }
  | {
      type: "balance.change";
      payload: WalletWatcherEventMap["balanceChanged"] & { identity: string };
    }
  | { type: "proposals.update"; result: CcfProposalFetchResult }
  | { type: "tick.sample"; sample: TickSample };

export interface AutomationEventBus {
  publish(event: AutomationEvent): Promise<void> | void;
}

export class ConsoleAutomationEventBus implements AutomationEventBus {
  async publish(event: AutomationEvent) {
    switch (event.type) {
      case "balance.snapshot":
        console.info("[sdk] balance snapshot", { identities: event.snapshots.length });
        break;
      case "balance.change":
        console.info("[sdk] balance change", {
          identity: event.payload.identity,
          previous: event.payload.previous?.balance,
          current: event.payload.current.balance,
        });
        break;
      case "proposals.update":
        console.info("[sdk] proposals update", {
          proposals: event.result.proposals.length,
          epoch: event.result.epoch,
        });
        break;
      case "tick.sample":
        console.info("[sdk] tick sample", {
          tick: event.sample.tick,
          deltaMs: event.sample.deltaMs,
        });
        break;
    }
  }
}

export interface WebhookEventBusOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class WebhookAutomationEventBus implements AutomationEventBus {
  constructor(private readonly options: WebhookEventBusOptions) {}

  async publish(event: AutomationEvent) {
    const fetcher = this.options.fetchImpl ?? globalThis.fetch;
    if (!fetcher) {
      throw new Error("fetch is not available in this environment");
    }
    await fetcher(this.options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.options.headers,
      },
      body: JSON.stringify({ ...event, timestamp: Date.now() }),
    });
  }
}
