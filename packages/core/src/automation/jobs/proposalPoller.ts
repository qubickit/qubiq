import type { CcfProposalFetchResult } from "@proposals/ccf";

import type { AutomationJob } from "../types";

export interface ProposalPollerJobOptions {
  fetch: () => Promise<CcfProposalFetchResult>;
  onUpdate?: (result: CcfProposalFetchResult) => Promise<void> | void;
}

export function createProposalPollerJob(options: ProposalPollerJobOptions): AutomationJob {
  return async ({ logger, signal }) => {
    if (signal.aborted) {
      return;
    }
    try {
      const result = await options.fetch();
      logger.info("proposal poller fetched data", {
        epoch: result.epoch,
        proposals: result.proposals.length,
        active: result.activeIndices.length,
      });
      if (options.onUpdate) {
        await options.onUpdate(result);
      }
    } catch (error) {
      logger.error("proposal poller failed", error);
    }
  };
}
