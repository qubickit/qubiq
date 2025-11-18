import { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { TickSample } from "@monitoring/tickMonitor";
import { TickMonitor } from "@monitoring/tickMonitor";
import type { CcfProposalFetchResult } from "@proposals/ccf";
import { fetchCcfProposalsFromContract } from "@proposals/ccf";
import type { WalletWatcherEventMap } from "@wallet/watcher";
import { WalletWatcher } from "@wallet/watcher";

import type { BalanceSnapshot } from "./jobs/balanceSnapshot";
import { createBalanceSnapshotJob } from "./jobs/balanceSnapshot";
import { createProposalPollerJob } from "./jobs/proposalPoller";
import { AutomationPipeline } from "./pipeline";
import type { AutomationLogger, AutomationPipelineOptions } from "./types";
import { createAutomationLogger } from "./types";

export interface AutomationProfileIntervals {
  balanceSnapshotMs?: number;
  proposalPollMs?: number;
  tickMonitorMs?: number;
}

export interface AutomationProfile {
  name: string;
  liveServiceBaseUrl: string;
  balanceIdentities: string[];
  watchIdentities?: string[];
  ccfEpochOverride?: number;
  intervals?: AutomationProfileIntervals;
}

export const DEFAULT_AUTOMATION_PROFILES: Record<"mainnet" | "testnet", AutomationProfile> = {
  mainnet: {
    name: "mainnet",
    liveServiceBaseUrl: "https://api.qubic.org",
    balanceIdentities: [],
    watchIdentities: [],
    intervals: {
      balanceSnapshotMs: 60_000,
      proposalPollMs: 120_000,
      tickMonitorMs: 5_000,
    },
  },
  testnet: {
    name: "testnet",
    liveServiceBaseUrl: "https://sandbox.api.qubic.org",
    balanceIdentities: [],
    watchIdentities: [],
    intervals: {
      balanceSnapshotMs: 60_000,
      proposalPollMs: 120_000,
      tickMonitorMs: 5_000,
    },
  },
};

export type AutomationProfileInput = AutomationProfile | keyof typeof DEFAULT_AUTOMATION_PROFILES;

export interface AutomationRuntimeOptions {
  logger?: AutomationLogger;
  client?: LiveServiceClient;
  onBalanceSnapshot?: (snapshots: BalanceSnapshot[]) => Promise<void> | void;
  onBalanceChange?: (
    payload: WalletWatcherEventMap["balanceChanged"] & { identity: string },
  ) => Promise<void> | void;
  onProposals?: (result: CcfProposalFetchResult) => Promise<void> | void;
  onTickSample?: (sample: TickSample) => Promise<void> | void;
}

export interface AutomationRuntime {
  profile: AutomationProfile;
  pipeline: AutomationPipeline;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function resolveAutomationProfile(input: AutomationProfileInput): AutomationProfile {
  if (typeof input === "string") {
    const profile = DEFAULT_AUTOMATION_PROFILES[input as keyof typeof DEFAULT_AUTOMATION_PROFILES];
    if (!profile) {
      throw new Error(`Unknown automation profile "${input}"`);
    }
    return {
      ...profile,
      balanceIdentities: [...profile.balanceIdentities],
      watchIdentities: [...(profile.watchIdentities ?? [])],
      intervals: { ...profile.intervals },
    };
  }
  return {
    ...input,
    balanceIdentities: [...input.balanceIdentities],
    watchIdentities: [...(input.watchIdentities ?? [])],
    intervals: { ...input.intervals },
  };
}

export function createAutomationRuntime(
  input: AutomationProfileInput,
  options: AutomationRuntimeOptions = {},
): AutomationRuntime {
  const profile = resolveAutomationProfile(input);
  const logger = createAutomationLogger(options.logger);
  const client = options.client ?? new LiveServiceClient({ baseUrl: profile.liveServiceBaseUrl });
  const pipelineOptions: AutomationPipelineOptions = { logger };
  const pipeline = new AutomationPipeline(pipelineOptions);

  if (profile.balanceIdentities.length > 0) {
    const snapshotJob = createBalanceSnapshotJob({
      identities: profile.balanceIdentities,
      fetchBalance: (identity) => client.getBalance(identity),
      onSnapshot: async (snapshots) => {
        if (options.onBalanceSnapshot) {
          await options.onBalanceSnapshot(snapshots);
        } else {
          logger.info("balance snapshot completed", {
            identities: snapshots.length,
          });
        }
      },
    });

    pipeline.addTask({
      name: `${profile.name}-balance-snapshot`,
      job: snapshotJob,
      intervalMs: profile.intervals?.balanceSnapshotMs ?? 60_000,
      runOnStart: true,
    });
  }

  const proposalJob = createProposalPollerJob({
    fetch: () => fetchCcfProposalsFromContract(client, profile.ccfEpochOverride),
    onUpdate: options.onProposals,
  });

  pipeline.addTask({
    name: `${profile.name}-ccf-proposals`,
    job: proposalJob,
    intervalMs: profile.intervals?.proposalPollMs ?? 120_000,
    runOnStart: true,
  });

  const tickMonitor = profile.intervals?.tickMonitorMs
    ? new TickMonitor({
        client,
        intervalMs: profile.intervals.tickMonitorMs,
      })
    : null;

  if (tickMonitor) {
    tickMonitor.addSampleListener((sample) => {
      if (options.onTickSample) {
        void options.onTickSample(sample);
      } else {
        logger.info("tick sample", {
          tick: sample.tick,
          epoch: sample.epoch,
          deltaTick: sample.deltaTick,
          deltaMs: sample.deltaMs,
        });
      }
    });
    tickMonitor.addErrorListener((error) => {
      logger.error("tick monitor error", error);
    });
  }

  const watchers = (profile.watchIdentities ?? []).map((identity) => {
    const watcher = new WalletWatcher({ identity, client, pollIntervalMs: 15_000 });
    const unsubscribeBalance = watcher.on("balanceChanged", (event) => {
      const payload = { ...event, identity };
      if (options.onBalanceChange) {
        void options.onBalanceChange(payload);
      } else {
        logger.info("balance changed", {
          identity,
          previous: event.previous?.balance,
          current: event.current.balance,
        });
      }
    });
    const unsubscribeError = watcher.on("error", (error) => {
      logger.error("wallet watcher error", error, { identity });
    });
    return {
      watcher,
      cleanup: () => {
        unsubscribeBalance();
        unsubscribeError();
      },
    };
  });

  return {
    profile,
    pipeline,
    async start() {
      tickMonitor?.start();
      await Promise.all(watchers.map(({ watcher }) => watcher.start()));
      await pipeline.start();
    },
    async stop() {
      await pipeline.stop();
      tickMonitor?.stop();
      watchers.forEach(({ watcher, cleanup }) => {
        watcher.stop();
        cleanup();
      });
    },
  };
}
