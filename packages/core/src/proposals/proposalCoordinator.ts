import type {
  ProposalIndicesRequest,
  ProposalIndicesResponse,
  ShareholderProposal,
  ShareholderVotingSummary,
} from "@types";
import { ProposalIndicesRequestSchema, ProposalIndicesResponseSchema } from "@types";

export interface ProposalSource {
  fetchProposals(): Promise<ShareholderProposal[]>;
  fetchVotingSummary?(proposalIndex: number): Promise<ShareholderVotingSummary | undefined>;
}

export class ProposalCoordinator {
  constructor(private readonly source: ProposalSource) {}

  async getProposalIndices(request: ProposalIndicesRequest): Promise<ProposalIndicesResponse> {
    const parsed = ProposalIndicesRequestSchema.parse(request);
    const proposals = await this.source.fetchProposals();
    const filtered = proposals.filter((proposal) => {
      return parsed.activeProposals
        ? proposal.acceptedOption === undefined
        : proposal.acceptedOption !== undefined;
    });

    const start = parsed.prevProposalIndex < 0 ? 0 : parsed.prevProposalIndex + 1;
    const indices = filtered.slice(start, start + 64).map((p) => p.index);
    return ProposalIndicesResponseSchema.parse({ numOfIndices: indices.length, indices });
  }

  async finalizeAcceptedProposals(
    handler: (proposal: ShareholderProposal) => Promise<void> | void,
  ) {
    const proposals = await this.source.fetchProposals();
    for (const proposal of proposals) {
      if (proposal.acceptedOption && proposal.acceptedOption > 0) {
        await handler(proposal);
      }
    }
  }
}
