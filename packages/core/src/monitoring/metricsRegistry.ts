import type { BalanceSample } from "./balanceMonitor";
import type { TickSample } from "./tickMonitor";

export interface RequestMetricSnapshot {
  name: string;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  lastDurationMs: number;
  lastErrorMessage?: string;
  lastErrorTimestamp?: number;
}

export class TelemetryMetricsRegistry {
  private tickSample: TickSample | null = null;
  private readonly balances = new Map<string, BalanceSample>();
  private readonly requests = new Map<string, RequestMetricSnapshot>();

  recordTick(sample: TickSample) {
    this.tickSample = sample;
  }

  recordBalance(sample: BalanceSample) {
    this.balances.set(sample.identity, sample);
  }

  recordRequest(
    name: string,
    durationMs: number,
    success: boolean,
    errorMessage?: string,
  ): RequestMetricSnapshot {
    const existing = this.requests.get(name);
    const prevSuccess = existing?.successCount ?? 0;
    const prevError = existing?.errorCount ?? 0;
    const next: RequestMetricSnapshot = {
      name,
      successCount: success ? prevSuccess + 1 : prevSuccess,
      errorCount: success ? prevError : prevError + 1,
      totalDurationMs: (existing?.totalDurationMs ?? 0) + durationMs,
      lastDurationMs: durationMs,
      lastErrorMessage: success ? existing?.lastErrorMessage : errorMessage,
      lastErrorTimestamp: success ? existing?.lastErrorTimestamp : Date.now(),
    };
    this.requests.set(name, next);
    return next;
  }

  getLatestTick(): TickSample | null {
    return this.tickSample;
  }

  getBalanceSamples(): BalanceSample[] {
    return [...this.balances.values()];
  }

  getRequestMetrics(): RequestMetricSnapshot[] {
    return [...this.requests.values()];
  }

  toPrometheus(): string {
    const lines: string[] = [];

    lines.push("# HELP qubic_tick_current Current tick height reported by the live service");
    lines.push("# TYPE qubic_tick_current gauge");
    if (this.tickSample) {
      lines.push(`qubic_tick_current{epoch="${this.tickSample.epoch}"} ${this.tickSample.tick}`);
      lines.push("# HELP qubic_tick_delta Tick delta between samples");
      lines.push("# TYPE qubic_tick_delta gauge");
      lines.push(`qubic_tick_delta ${this.tickSample.deltaTick}`);
      lines.push("# HELP qubic_tick_sample_age_ms Milliseconds since the last tick sample");
      lines.push("# TYPE qubic_tick_sample_age_ms gauge");
      const age = Date.now() - this.tickSample.timestamp;
      lines.push(`qubic_tick_sample_age_ms ${age}`);
    } else {
      lines.push("qubic_tick_current 0");
    }

    lines.push("# HELP qubic_balance Balance for tracked identities");
    lines.push("# TYPE qubic_balance gauge");
    for (const sample of this.balances.values()) {
      lines.push(`qubic_balance{identity="${sample.identity}"} ${sample.balance.toString()}`);
      lines.push(`qubic_balance_delta{identity="${sample.identity}"} ${sample.delta.toString()}`);
    }

    lines.push("# HELP qubic_request_duration_ms_sum Total duration of monitored requests");
    lines.push("# TYPE qubic_request_duration_ms_sum counter");
    lines.push("# HELP qubic_request_success_total Number of successful monitored requests");
    lines.push("# TYPE qubic_request_success_total counter");
    lines.push("# HELP qubic_request_error_total Number of failed monitored requests");
    lines.push("# TYPE qubic_request_error_total counter");
    for (const metric of this.requests.values()) {
      const label = `{name="${metric.name}"}`;
      lines.push(`qubic_request_duration_ms_sum${label} ${metric.totalDurationMs.toFixed(3)}`);
      lines.push(`qubic_request_success_total${label} ${metric.successCount}`);
      lines.push(`qubic_request_error_total${label} ${metric.errorCount}`);
    }

    return `${lines.join("\n")}\n`;
  }
}
