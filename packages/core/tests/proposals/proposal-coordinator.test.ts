import { expect, test } from "bun:test";

import { ProposalCoordinator } from "@proposals/proposalCoordinator";
import type { ShareholderProposal } from "@types";

const proposals: ShareholderProposal[] = [
  { index: 0, data: { epoch: 100, type: 0x200 }, acceptedOption: undefined },
  { index: 1, data: { epoch: 100, type: 0x200 }, acceptedOption: 1 },
];

const source = {
  async fetchProposals() {
    return proposals;
  },
};

const coordinator = new ProposalCoordinator(source);

test("ProposalCoordinator returns indices", async () => {
  const response = await coordinator.getProposalIndices({
    activeProposals: true,
    prevProposalIndex: -1,
  });
  expect(response.numOfIndices).toBe(1);
  expect(response.indices[0]).toBe(0);
});

test("ProposalCoordinator finalizes accepted proposals", async () => {
  let finalized = 0;
  await coordinator.finalizeAcceptedProposals(() => {
    finalized += 1;
  });
  expect(finalized).toBe(1);
});
