import { EventEmitter } from "node:events";

import type { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { TelemetryLogger } from "./types";
import { createTelemetryLogger } from "./types";

export interface TickMonitorOptions {
  client: Pick<LiveServiceClient, "getTickInfo">;
  intervalMs?: number;
  logger?: TelemetryLogger;
}

export interface TickSample {
  tick: number;
  epoch: number;
  durationMs: number;
  deltaTick: number;
  deltaMs: number;
  timestamp: number;
}

type TickMonitorEvents = {
  sample: (sample: TickSample) => void;
  error: (error: unknown) => void;
};

export class TickMonitor extends EventEmitter {
  private readonly client: Pick<LiveServiceClient, "getTickInfo">;
  private readonly intervalMs: number;
  private readonly logger: TelemetryLogger;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick?: number;
  private lastTimestamp?: number;
  private running = false;

  constructor(options: TickMonitorOptions) {
    super();
    this.client = options.client;
    this.intervalMs = Math.max(1000, options.intervalMs ?? 5_000);
    this.logger = createTelemetryLogger(options.logger);
  }

  start() {
    if (this.running) {
      return;
    }
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
    try {
      const response = await this.client.getTickInfo();
      const { tick, duration, epoch } = response.tickInfo;
      const timestamp = Date.now();
      const deltaTick = this.lastTick !== undefined ? tick - this.lastTick : 0;
      const deltaMs = this.lastTimestamp !== undefined ? timestamp - this.lastTimestamp : 0;

      const sample: TickSample = {
        tick,
        epoch,
        durationMs: duration,
        deltaTick,
        deltaMs,
        timestamp,
      };

      this.lastTick = tick;
      this.lastTimestamp = timestamp;
      this.emit("sample", sample);
    } catch (error) {
      this.logger.error("tick monitor failed", error);
      this.emit("error", error);
    }
  }

  addSampleListener(listener: (sample: TickSample) => void): this {
    return this.on("sample", listener);
  }

  addErrorListener(listener: (error: unknown) => void): this {
    return this.on("error", listener as TickMonitorEvents["error"]);
  }
}
