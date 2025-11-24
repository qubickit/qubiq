import { expect, test } from "bun:test";

import type { BalanceSample } from "@monitoring/balanceMonitor";
import { TelemetryMetricsRegistry } from "@monitoring/metricsRegistry";
import type { TickSample } from "@monitoring/tickMonitor";

test("TelemetryMetricsRegistry renders Prometheus output", () => {
  const registry = new TelemetryMetricsRegistry();

  const tickSample: TickSample = {
    tick: 123,
    epoch: 10,
    durationMs: 1000,
    deltaTick: 1,
    deltaMs: 1000,
    timestamp: Date.now(),
  };
  registry.recordTick(tickSample);

  const balanceSample: BalanceSample = {
    identity: "A".repeat(60),
    balance: 1000n,
    delta: 200n,
    latestIncomingTick: 50,
    latestOutgoingTick: 40,
    timestamp: Date.now(),
  };
  registry.recordBalance(balanceSample);

  registry.recordRequest("live.getBalance", 10, true);
  registry.recordRequest("live.getBalance", 5, false, "boom");

  const output = registry.toPrometheus();
  expect(output).toContain("qubic_tick_current");
  expect(output).toContain("qubic_balance");
  expect(output).toContain(balanceSample.identity);
  expect(output).toContain("qubic_request_success_total");

  const metrics = registry.getRequestMetrics();
  expect(metrics[0]?.successCount).toBe(1);
  expect(metrics[0]?.errorCount).toBe(1);
});
