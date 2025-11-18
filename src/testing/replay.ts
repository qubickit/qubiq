import { setTimeout as delay } from "node:timers/promises";

import type { TickSnapshot, TransactionSnapshot } from "./fixtures";

export interface SnapshotReplayOptions {
  delayMs?: number;
  loop?: boolean;
  signal?: AbortSignal;
}

export async function replayTickSnapshots(
  snapshots: TickSnapshot[],
  handler: (snapshot: TickSnapshot) => Promise<void> | void,
  options: SnapshotReplayOptions = {},
) {
  await replaySnapshots(snapshots, handler, options);
}

export async function replayTransactionSnapshots(
  snapshots: TransactionSnapshot[],
  handler: (snapshot: TransactionSnapshot) => Promise<void> | void,
  options: SnapshotReplayOptions = {},
) {
  await replaySnapshots(snapshots, handler, options);
}

async function replaySnapshots<T>(
  snapshots: T[],
  handler: (snapshot: T) => Promise<void> | void,
  options: SnapshotReplayOptions,
) {
  if (snapshots.length === 0) return;
  const delayMs = options.delayMs ?? 10;

  do {
    for (const snapshot of snapshots) {
      if (options.signal?.aborted) return;
      await handler(snapshot);
      if (delayMs > 0) {
        try {
          await delay(delayMs, undefined, { signal: options.signal });
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            return;
          }
          throw error;
        }
      }
    }
  } while (options.loop && !options.signal?.aborted);
}
