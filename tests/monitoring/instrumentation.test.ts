import { expect, test } from "bun:test";

import { instrumentRequest } from "@monitoring/instrumentation";
import { TelemetryMetricsRegistry } from "@monitoring/metricsRegistry";

test("instrumentRequest records success metrics", async () => {
  const registry = new TelemetryMetricsRegistry();
  await instrumentRequest(
    async () => {
      return "ok";
    },
    { name: "demo.success", registry },
  );

  const metrics = registry.getRequestMetrics().find((metric) => metric.name === "demo.success");
  expect(metrics?.successCount).toBe(1);
  expect(metrics?.errorCount).toBe(0);
});

test("instrumentRequest records failures", async () => {
  const registry = new TelemetryMetricsRegistry();
  await expect(
    instrumentRequest(
      async () => {
        throw new Error("fail");
      },
      { name: "demo.error", registry },
    ),
  ).rejects.toThrow("fail");

  const metrics = registry.getRequestMetrics().find((metric) => metric.name === "demo.error");
  expect(metrics?.errorCount).toBe(1);
});
