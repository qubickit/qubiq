#!/usr/bin/env bun
import {
  createAutomationRuntime,
  DEFAULT_AUTOMATION_PROFILES,
  resolveAutomationProfile,
} from "../src";

const argv = process.argv.slice(2);
const PROFILE_FLAG = argv.find((arg) => arg.startsWith("--profile="));
const PROFILE = PROFILE_FLAG ? (PROFILE_FLAG.split("=")[1] ?? "mainnet") : "mainnet";
const HELP = argv.includes("--help") || argv.includes("-h");
const KNOWN_PROFILES = Object.keys(DEFAULT_AUTOMATION_PROFILES);

function parseIdentities(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const envIdentities = parseIdentities(process.env.QUBIC_AUTOMATION_IDENTITIES);

async function main() {
  if (HELP) {
    console.log(`Usage: bun run example:automation [--profile=mainnet]

Options:
  --profile=name   Automation profile to use (${KNOWN_PROFILES.join(", ")}). Default: mainnet
  -h, --help       Show this message

Environment:
  QUBIC_AUTOMATION_IDENTITIES=ID1,ID2   Optional comma-separated identities watched for snapshots/alerts.`);
    return;
  }

  type ProfileName = keyof typeof DEFAULT_AUTOMATION_PROFILES;
  const profileKey = (PROFILE in DEFAULT_AUTOMATION_PROFILES ? PROFILE : "mainnet") as ProfileName;
  const baseProfile = resolveAutomationProfile(profileKey);
  const mergedProfile = {
    ...baseProfile,
    balanceIdentities: envIdentities.length > 0 ? envIdentities : baseProfile.balanceIdentities,
    watchIdentities: envIdentities.length > 0 ? envIdentities : baseProfile.watchIdentities,
  };

  const runtime = createAutomationRuntime(mergedProfile, {
    onBalanceSnapshot: (snapshots) => {
      console.log(
        `[automation] captured ${snapshots.length} balance snapshots at ${new Date().toISOString()}`,
      );
    },
    onProposals: (result) => {
      console.log(
        `[automation] epoch ${result.epoch}: ${result.proposals.length} proposals (${result.activeIndices.length} active)`,
      );
    },
    onBalanceChange: (event) => {
      console.log(`[automation][balance] ${event.identity} → balance=${event.current.balance}`);
    },
    onTickSample: (sample) => {
      console.log(
        `[automation][tick] tick=${sample.tick} epoch=${sample.epoch} Δtick=${sample.deltaTick} Δms=${sample.deltaMs}`,
      );
    },
  });

  await runtime.start();
  console.log(`[automation] runtime "${mergedProfile.name}" started. Press Ctrl+C to stop.`);

  await waitForShutdownSignal();
  console.log("[automation] stopping...");
  await runtime.stop();
  console.log("[automation] stopped gracefully");
}

function waitForShutdownSignal(): Promise<void> {
  return new Promise((resolve) => {
    const handle = () => {
      process.off("SIGINT", handle);
      process.off("SIGTERM", handle);
      resolve();
    };
    process.on("SIGINT", handle);
    process.on("SIGTERM", handle);
  });
}

main().catch((error) => {
  console.error("[automation] runtime crashed", error);
  process.exit(1);
});
