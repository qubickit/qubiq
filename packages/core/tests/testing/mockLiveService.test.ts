import { expect, test } from "bun:test";

import { MockLiveServiceClient } from "@testing/mockLiveService";
import type { BalanceResponse, TickInfoResponse } from "@types";

test("MockLiveServiceClient serves fixtures", async () => {
  const tickFixture: TickInfoResponse = {
    tickInfo: { tick: 42, duration: 1000, epoch: 12, initialTick: 0 },
  };
  const balanceFixture: BalanceResponse = {
    balance: {
      id: "A".repeat(60),
      balance: "100",
      validForTick: 1,
      latestIncomingTransferTick: 1,
      latestOutgoingTransferTick: 0,
      incomingAmount: "100",
      outgoingAmount: "0",
      numberOfIncomingTransfers: 1,
      numberOfOutgoingTransfers: 0,
    },
  };

  const mockClient = new MockLiveServiceClient({
    tickInfo: tickFixture,
    balances: { [balanceFixture.balance.id]: balanceFixture },
    contractResponses: { "8:1": { responseData: Buffer.from("test").toString("base64") } },
  });

  const tick = await mockClient.getTickInfo();
  expect(tick.tickInfo.tick).toBe(42);

  const balance = await mockClient.getBalance(balanceFixture.balance.id);
  expect(balance.balance.balance).toBe("100");

  const contract = await mockClient.querySmartContract({
    contractIndex: 8,
    inputType: 1,
    inputSize: 0,
    requestData: "",
  });
  expect(Buffer.from(contract.responseData, "base64").toString("utf-8")).toBe("test");

  const response = await mockClient.broadcastTransaction({ encodedTransaction: "abc" });
  expect(response.transactionId).toBeDefined();
  expect(mockClient.getBroadcastLog()).toHaveLength(1);
});
