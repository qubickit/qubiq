#!/usr/bin/env bun
import { BootManager } from "../src";

async function main() {
  const manager = new BootManager();
  const decision = await manager.decide();

  console.log("Boot flag:", decision.flag);
  console.log("Mode:", decision.mode === 1 ? "SCRATCH" : "SEAMLESS");
  console.log("Epoch:", decision.epoch);
  console.log("Reason:", decision.reason);
}

main().catch((error) => {
  console.error("Boot decision failed", error);
  process.exit(1);
});
