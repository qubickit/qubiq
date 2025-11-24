import { expect, test } from "bun:test";
import http from "node:http";

import { TelemetryMetricsRegistry } from "@monitoring/metricsRegistry";
import { PrometheusMetricsServer } from "@monitoring/prometheusServer";
import type { TickSample } from "@monitoring/tickMonitor";

test("PrometheusMetricsServer serves metrics", async () => {
  const registry = new TelemetryMetricsRegistry();
  const sample: TickSample = {
    tick: 1,
    epoch: 1,
    durationMs: 1000,
    deltaTick: 0,
    deltaMs: 0,
    timestamp: Date.now(),
  };
  registry.recordTick(sample);

  const server = new PrometheusMetricsServer({ registry, port: 0, host: "127.0.0.1" });
  await server.start();
  const port = server.getPort();

  const responseBody = await new Promise<string>((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}/metrics`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });

  expect(responseBody).toContain("qubic_tick_current");
  await server.stop();
});
