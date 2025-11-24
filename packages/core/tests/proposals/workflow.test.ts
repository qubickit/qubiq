import { expect, mock, test } from "bun:test";

import {
  buildProposalFromDraft,
  createDefaultProposalRegistry,
  describeShareholderProposal,
  finalizeProposalsWithSummary,
  parseProposalDraft,
} from "@proposals";
import type { ShareholderProposal } from "@types";

const registry = createDefaultProposalRegistry();

test("buildProposalFromDraft parses JSON payloads", () => {
  const draft = parseProposalDraft({
    template: "transfer",
    input: {
      epoch: 12,
      destination: "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
      amount: 100,
    },
    metadata: { author: "ops" },
  });

  const result = buildProposalFromDraft(registry, draft, { simulate: true });
  expect(result.data.epoch).toBe(12);
  expect(result.simulation?.summary).toContain("Transfer");
  expect(result.metadata?.author).toBe("ops");
});

test("describeShareholderProposal renders status", () => {
  const baseProposal: ShareholderProposal = {
    index: 1,
    data: {
      epoch: 1,
      type: 0xf00,
      transferOptions: {
        destination: "36af16d5265b7443d798891122b91a74893752107fe0286c45856bd793e339ff",
        amount: BigInt(10),
      },
    },
  };

  expect(describeShareholderProposal(baseProposal)).toContain("[PENDING]");
  expect(describeShareholderProposal({ ...baseProposal, acceptedOption: 1 })).toContain(
    "[ACCEPTED]",
  );
});

test("finalizeProposalsWithSummary pipes summaries to handler", async () => {
  const proposals: ShareholderProposal[] = [
    {
      index: 0,
      data: {
        epoch: 1,
        type: 0xf00,
        transferOptions: {
          destination: "36af16d5265b7443d798891122b91a74893752107fe0286c45856bd793e339ff",
          amount: BigInt(5),
        },
      },
      acceptedOption: 1,
    },
  ];

  const coordinator = {
    finalizeAcceptedProposals: async (
      handler: (proposal: ShareholderProposal) => Promise<void>,
    ) => {
      for (const proposal of proposals) {
        await handler(proposal);
      }
    },
  } satisfies Pick<Parameters<typeof finalizeProposalsWithSummary>[0], "finalizeAcceptedProposals">;

  const handler = mock((proposal: ShareholderProposal, ctx: { summary: string }) => {
    expect(proposal.index).toBe(0);
    expect(ctx.summary).toContain("[ACCEPTED]");
  });

  await finalizeProposalsWithSummary(coordinator, handler);
  expect(handler.mock.calls.length).toBe(1);
});
