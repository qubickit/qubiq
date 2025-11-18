#!/usr/bin/env bun
import {
  BalanceMonitor,
  LiveServiceClient,
  PrometheusMetricsServer,
  TelemetryMetricsRegistry,
  TickMonitor,
} from "../src";

const argv = process.argv.slice(2);
const HELP = argv.includes("--help") || argv.includes("-h");
const BASE_URL_FLAG = argv.find((arg) => arg.startsWith("--base-url="));
const BASE_URL =
  process.env.QUBIC_LIVE_URL ?? BASE_URL_FLAG?.split("=")?.[1] ?? "https://api.qubic.org";
const IDENTITIES_FLAG = argv.find((arg) => arg.startsWith("--identities="));
const PORT_FLAG = argv.find((arg) => arg.startsWith("--port="));
const PORT = PORT_FLAG ? Number(PORT_FLAG.split("=")[1]) : 9400;

const identities = process.env.QUBIC_DASHBOARD_IDENTITIES ?? IDENTITIES_FLAG?.split("=")[1];
const identityList = identities
  ? identities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  : [];

if (HELP) {
  console.log(`Usage: bun run example:dashboard [options]

Options:
  --base-url=URL       Override LiveService base URL (default ${BASE_URL})
  --identities=A,B     Comma separated identities to track balances
  --port=PORT          Prometheus metrics port (default 9400)
  -h, --help           Show this help message

Environment:
  QUBIC_LIVE_URL               Override LiveService base URL
  QUBIC_DASHBOARD_IDENTITIES   Comma separated identities to track balances
`);
  process.exit(0);
}

async function main() {
  const client = new LiveServiceClient({ baseUrl: BASE_URL });
  const registry = new TelemetryMetricsRegistry();

  const tickMonitor = new TickMonitor({ client, intervalMs: 2000 });
  tickMonitor.addSampleListener((sample) => registry.recordTick(sample));
  tickMonitor.addErrorListener((error) => {
    registry.recordRequest("tick-monitor.error", 0, false, (error as Error).message);
  });

  const balanceMonitor =
    identityList.length > 0
      ? new BalanceMonitor({ client, identities: identityList, intervalMs: 5_000 })
      : null;
  balanceMonitor?.addSampleListener((sample) => registry.recordBalance(sample));

  const server = new PrometheusMetricsServer({ registry, port: PORT });
  await server.start();

  tickMonitor.start();
  balanceMonitor?.start();

  console.log(
    `[dashboard] monitoring ticks (and ${identityList.length} balances). Prometheus metrics on :${server.getPort()}/metrics`,
  );
  setInterval(() => {
    printSummary(registry);
  }, 5_000).unref();
}

function printSummary(registry: TelemetryMetricsRegistry) {
  const tick = registry.getLatestTick();
  const balances = registry.getBalanceSamples();
  const requests = registry.getRequestMetrics();

  console.clear();
  console.log(`[dashboard] ${new Date().toISOString()}`);
  if (tick) {
    console.log(
      `Tick ${tick.tick} (epoch ${tick.epoch}) Δtick=${tick.deltaTick} Δms=${tick.deltaMs}`,
    );
  } else {
    console.log("No tick samples yet.");
  }

  if (balances.length > 0) {
    console.log("Balances:");
    for (const sample of balances) {
      console.log(
        `  ${sample.identity}: ${sample.balance.toString()} (Δ ${sample.delta.toString()})`,
      );
    }
  }

  if (requests.length > 0) {
    console.log("Request metrics:");
    for (const metric of requests) {
      console.log(
        `  ${metric.name}: success=${metric.successCount} errors=${metric.errorCount} totalDurationMs=${metric.totalDurationMs.toFixed(
          1,
        )}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("[dashboard] crashed", error);
  process.exit(1);
});
