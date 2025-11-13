import { expect, test } from "bun:test";

import {
  EntityRecordSchema,
  ProposalDataSchema,
  ProposalIndicesRequestSchema,
  ProposalIndicesResponseSchema,
  ProposalVariableOptionsSchema,
  RequestResponseHeaderSchema,
  ShareholderProposalSchema,
  TransactionSchema,
} from "@types";

test("RequestResponseHeaderSchema accepts valid header", () => {
  const header = RequestResponseHeaderSchema.parse({
    size: 1024,
    type: 24,
    dejavu: 42,
  });
  expect(header.size).toBe(1024);
});

test("RequestResponseHeaderSchema rejects oversize payloads", () => {
  expect(() =>
    RequestResponseHeaderSchema.parse({
      size: 0x1_0000_00,
      type: 24,
      dejavu: 1,
    }),
  ).toThrow();
});

test("TransactionSchema validates canonical layout", () => {
  const tx = TransactionSchema.parse({
    sourcePublicKey: "ab".repeat(32),
    destinationPublicKey: "cd".repeat(32),
    amount: BigInt(100),
    tick: 10,
    inputType: 1,
    inputSize: 0,
    signature: "ef".repeat(64),
  });
  expect(tx.amount).toBe(BigInt(100));
});

test("TransactionSchema rejects short signatures", () => {
  expect(() =>
    TransactionSchema.parse({
      sourcePublicKey: "ab".repeat(32),
      destinationPublicKey: "cd".repeat(32),
      amount: BigInt(100),
      tick: 10,
      inputType: 1,
      inputSize: 0,
      signature: "01",
    }),
  ).toThrow();
});

test("EntityRecordSchema guards counters", () => {
  const entity = EntityRecordSchema.parse({
    publicKey: "ab".repeat(32),
    incomingAmount: BigInt(0),
    outgoingAmount: BigInt(0),
    numberOfIncomingTransfers: 0,
    numberOfOutgoingTransfers: 0,
    latestIncomingTransferTick: 0,
    latestOutgoingTransferTick: 0,
  });
  expect(entity.publicKey).toHaveLength(64);
});

test("Proposal schemas enforce bounded options", () => {
  const proposal = ShareholderProposalSchema.parse({
    index: 1,
    data: ProposalDataSchema.parse({
      epoch: 99,
      type: 0x200,
      description: "Update variable X",
      variableOptions: ProposalVariableOptionsSchema.parse({
        variable: 0,
        value: 42,
      }),
      options: ["yes", "no"],
    }),
  });
  expect(proposal.data.options?.length).toBe(2);
});

test("ProposalIndicesRequest defaults prevProposalIndex to -1", () => {
  const req = ProposalIndicesRequestSchema.parse({
    activeProposals: true,
  });
  expect(req.prevProposalIndex).toBe(-1);
});

test("ProposalIndicesResponse caps indices", () => {
  ProposalIndicesResponseSchema.parse({
    numOfIndices: 2,
    indices: [0, 1],
  });
  expect(() =>
    ProposalIndicesResponseSchema.parse({
      numOfIndices: 65,
      indices: new Array(66).fill(0),
    }),
  ).toThrow();
});
