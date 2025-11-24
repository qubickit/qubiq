import type { LiveServiceClient, ShareholderProposal } from "@qubiq/core";
import {
  fetchCcfProposalsFromContract,
  describeShareholderProposal,
} from "@qubiq/core";
import type { CcfProposalFetchResult } from "@qubiq/core";

export interface CcfProposalQueryOptions {
  epoch?: number;
  limit?: number;
  status?: "active" | "finished" | "all";
}

export interface ProposalToolkit {
  fetchCcf(options?: CcfProposalQueryOptions): Promise<CcfProposalFetchResult>;
  listActive(options?: CcfProposalQueryOptions): Promise<ShareholderProposal[]>;
  listFinished(options?: CcfProposalQueryOptions): Promise<ShareholderProposal[]>;
  describe(proposal: ShareholderProposal): string;
  summarize(
    proposals: ShareholderProposal[],
    options?: { limit?: number },
  ): string[];
}

export function createProposalToolkit(client: LiveServiceClient): ProposalToolkit {
  const fetchCcf = async (options?: CcfProposalQueryOptions) => {
    const result = await fetchCcfProposalsFromContract(client, options?.epoch);
    if (options?.status === "active") {
      return {
        ...result,
        proposals: result.proposals.filter((proposal) =>
          result.activeIndices.includes(proposal.index),
        ),
      } satisfies CcfProposalFetchResult;
    }
    if (options?.status === "finished") {
      return {
        ...result,
        proposals: result.proposals.filter((proposal) =>
          result.finishedIndices.includes(proposal.index),
        ),
      } satisfies CcfProposalFetchResult;
    }
    return result;
  };

  const filterByIndices = (
    proposals: ShareholderProposal[],
    indices: number[],
    limit?: number,
  ) =>
    proposals
      .filter((proposal) => indices.includes(proposal.index))
      .slice(0, typeof limit === "number" ? limit : proposals.length);

  return {
    fetchCcf,
    listActive: async (options) => {
      const result = await fetchCcf(options);
      return filterByIndices(result.proposals, result.activeIndices, options?.limit);
    },
    listFinished: async (options) => {
      const result = await fetchCcf(options);
      return filterByIndices(result.proposals, result.finishedIndices, options?.limit);
    },
    describe: (proposal) => describeShareholderProposal(proposal),
    summarize: (proposals, options) => {
      const limit = options?.limit ?? proposals.length;
      return proposals.slice(0, limit).map((proposal) => describeShareholderProposal(proposal));
    },
  };
}
