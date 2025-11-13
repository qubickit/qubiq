#!/usr/bin/env bun
import type { ProposalSource, ShareholderProposal } from "../src";
import { ProposalCoordinator } from "../src";

class MemoryProposalSource implements ProposalSource {
  constructor(private readonly proposals: ShareholderProposal[]) {}

  async fetchProposals(): Promise<ShareholderProposal[]> {
    return this.proposals;
  }
}

async function run() {
  const source = new MemoryProposalSource([
    { index: 1, data: { epoch: 120, type: 0x200 }, acceptedOption: undefined },
    { index: 2, data: { epoch: 120, type: 0x200 }, acceptedOption: 1 },
  ]);

  const coordinator = new ProposalCoordinator(source);
  const response = await coordinator.getProposalIndices({
    activeProposals: true,
    prevProposalIndex: -1,
  });
  console.log("Active indices:", response.indices.join(", "));
}

run().catch((error) => {
  console.error("Failed to list proposals", error);
  process.exit(1);
});
