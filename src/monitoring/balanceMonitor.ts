import { EventEmitter } from "node:events";

import type { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { BalanceResponse } from "@types";
import type { TelemetryLogger } from "./types";
import { createTelemetryLogger } from "./types";

export interface BalanceMonitorOptions {
  client: Pick<LiveServiceClient, "getBalance">;
  identities: string[];
  intervalMs?: number;
  logger?: TelemetryLogger;
}

export interface BalanceSample {
  identity: string;
  balance: bigint;
  delta: bigint;
  latestIncomingTick: number;
  latestOutgoingTick: number;
  timestamp: number;
}

type BalanceMonitorEvents = {
  sample: (sample: BalanceSample) => void;
  error: (error: unknown, identity: string) => void;
};

export class BalanceMonitor extends EventEmitter {
  private readonly client: Pick<LiveServiceClient, "getBalance">;
  private readonly identities: string[];
  private readonly intervalMs: number;
  private readonly logger: TelemetryLogger;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private previousBalances = new Map<string, bigint>();

  constructor(options: BalanceMonitorOptions) {
    super();
    this.client = options.client;
    this.identities = options.identities;
    this.intervalMs = Math.max(1_000, options.intervalMs ?? 10_000);
    this.logger = createTelemetryLogger(options.logger);
  }

  start() {
    if (this.running) return;
    this.running = true;
    void this.poll();
    this.timer = setInterval(() => {
      void this.poll();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  private async poll() {
    for (const identity of this.identities) {
      try {
        const response = await this.client.getBalance(identity);
        const sample = this.buildSample(identity, response);
        this.emit("sample", sample);
      } catch (error) {
        this.logger.error("balance monitor failed", error, { identity });
        this.emit("error", error, identity);
      }
    }
  }

  private buildSample(identity: string, response: BalanceResponse): BalanceSample {
    const currentBalance = BigInt(response.balance.balance);
    const previousBalance = this.previousBalances.get(identity) ?? currentBalance;
    this.previousBalances.set(identity, currentBalance);

    return {
      identity,
      balance: currentBalance,
      delta: currentBalance - previousBalance,
      latestIncomingTick: response.balance.latestIncomingTransferTick,
      latestOutgoingTick: response.balance.latestOutgoingTransferTick,
      timestamp: Date.now(),
    };
  }

  addSampleListener(listener: (sample: BalanceSample) => void): this {
    return this.on("sample", listener);
  }

  addErrorListener(listener: (error: unknown, identity: string) => void): this {
    return this.on("error", listener as BalanceMonitorEvents["error"]);
  }
}
