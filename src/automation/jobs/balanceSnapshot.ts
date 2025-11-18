import type { BalanceResponse } from "@types";

import type { AutomationJob } from "../types";

export interface BalanceSnapshot {
  identity: string;
  balance: BalanceResponse["balance"];
  fetchedAt: Date;
}

export interface BalanceSnapshotJobOptions {
  identities: string[];
  fetchBalance(identity: string): Promise<BalanceResponse>;
  onSnapshot?(snapshots: BalanceSnapshot[]): void | Promise<void>;
}

export function createBalanceSnapshotJob(options: BalanceSnapshotJobOptions): AutomationJob {
  return async ({ logger, signal }) => {
    if (!options.identities.length) {
      return;
    }

    const snapshots: BalanceSnapshot[] = [];
    for (const identity of options.identities) {
      if (signal.aborted) break;
      try {
        const response = await options.fetchBalance(identity);
        snapshots.push({
          identity,
          balance: response.balance,
          fetchedAt: new Date(),
        });
      } catch (error) {
        logger.error("balance snapshot fetch failed", error, { identity });
      }
    }

    if (snapshots.length > 0 && options.onSnapshot) {
      await options.onSnapshot(snapshots);
    }
  };
}
