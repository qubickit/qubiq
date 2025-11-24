import { expect, test } from "bun:test";

import {
  ArchiveTransactionResponseSchema,
  BalanceResponseSchema,
  ComputorListsResponseSchema,
  QueryServiceTickResponseSchema,
  TickInfoResponseSchema,
  TransactionsForIdentityResponseSchema,
} from "@types";

const identity = "A".repeat(60);
const otherIdentity = "B".repeat(60);
const hash = "a".repeat(60);

test("TickInfoResponseSchema validates positive duration", () => {
  const info = TickInfoResponseSchema.parse({
    tickInfo: {
      tick: 1,
      duration: 1000,
      epoch: 10,
      initialTick: 0,
    },
  });
  expect(info.tickInfo.epoch).toBe(10);
});

test("BalanceResponseSchema rejects missing balances", () => {
  expect(() =>
    BalanceResponseSchema.parse({
      balance: {
        id: "",
        balance: "0",
        validForTick: 0,
        latestIncomingTransferTick: 0,
        latestOutgoingTransferTick: 0,
        incomingAmount: "0",
        outgoingAmount: "0",
        numberOfIncomingTransfers: 0,
        numberOfOutgoingTransfers: 0,
      },
    }),
  ).toThrow();
});

test("ArchiveTransactionResponseSchema accepts valid transaction data", () => {
  const response = ArchiveTransactionResponseSchema.parse({
    transaction: {
      id: "abc",
      hash,
      source: identity,
      destination: otherIdentity,
      tick: 1,
      timestamp: "1234567890",
      amount: "100",
      inputType: 0,
      inputSize: 0,
    },
  });
  expect(response.transaction.amount).toBe("100");
});

test("QueryServiceTickResponseSchema enforces non-negative ticks", () => {
  expect(() =>
    QueryServiceTickResponseSchema.parse({
      tickNumber: -1,
      epoch: 1,
      intervalInitialTick: 0,
    }),
  ).toThrow();
});

test("TransactionsForIdentityResponseSchema validates hits", () => {
  const response = TransactionsForIdentityResponseSchema.parse({
    transactions: [],
  });
  expect(response.transactions.length).toBe(0);
});

test("ComputorListsResponseSchema parses identity lists", () => {
  const response = ComputorListsResponseSchema.parse({
    computorsLists: [
      {
        epoch: 10,
        tickNumber: 100,
        identities: [identity, otherIdentity],
      },
    ],
  });
  const [firstList] = response.computorsLists ?? [];
  expect(firstList?.identities.length).toBe(2);
});
