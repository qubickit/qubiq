#!/usr/bin/env bun
import { QubicNodeClient } from "../src";

const identity = process.argv[2] ?? process.env.QUBIC_ID;

if (!identity) {
  console.error("Usage: bun run examples/watch-balance.ts <60-char-identity>");
  process.exit(1);
}

async function main() {
  const client = new QubicNodeClient();
  const watcher = client.watchWallet(identity, { pollIntervalMs: 5000 });

  watcher.on("balanceChanged", ({ current }) => {
    console.log(
      new Date().toISOString(),
      "balance:",
      current.balance,
      "incoming:",
      current.incomingAmount,
      "outgoing:",
      current.outgoingAmount,
    );
  });

  watcher.on("error", (err) => {
    console.error("Watcher error", err);
  });

  await watcher.start();
  console.log("Watching", identity, "- press Ctrl+C to stop");
}

main().catch((error) => {
  console.error("Watcher failed", error);
  process.exit(1);
});
