import { expect, mock, test } from "bun:test";
import type { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { QueryServiceClient } from "@clients/http/queryServiceClient";
import { QubicNodeClient } from "@node/qubicNodeClient";
import type {
  BalanceResponse,
  BroadcastTransactionResponse,
  QueryServiceTickResponse,
  TransactionsForIdentityResponse,
} from "@types";

const balanceResponse: BalanceResponse = {
  balance: {
    id: "A".repeat(60),
    balance: "1000",
    validForTick: 1,
    latestIncomingTransferTick: 1,
    latestOutgoingTransferTick: 0,
    incomingAmount: "1000",
    outgoingAmount: "0",
    numberOfIncomingTransfers: 1,
    numberOfOutgoingTransfers: 0,
  },
};

const liveClientMock = {
  getTickInfo: mock(async () => ({
    tickInfo: { tick: 1, duration: 1000, epoch: 2, initialTick: 0 },
  })),
  getBalance: mock(async () => balanceResponse),
  broadcastTransaction: mock(
    async () => ({ transactionId: "123" }) as BroadcastTransactionResponse,
  ),
} as unknown as LiveServiceClient;

const queryClientMock = {
  getLastProcessedTick: mock(
    async () => ({ tickNumber: 1, epoch: 2, intervalInitialTick: 0 }) as QueryServiceTickResponse,
  ),
  getTransactionsForIdentity: mock(
    async () => ({ transactions: [] }) as TransactionsForIdentityResponse,
  ),
  getTransactionsForTick: mock(async () => ({ transactions: [] })),
  getTransactionByHash: mock(async () => ({ hash: "a".repeat(60) })),
} as unknown as QueryServiceClient;

test("QubicNodeClient proxies live client calls", async () => {
  const client = new QubicNodeClient({
    liveClient: liveClientMock,
    queryClient: queryClientMock,
  });
  const balance = await client.getBalance("A".repeat(60));
  expect(balance.balance.balance).toBe("1000");
  expect(liveClientMock.getBalance).toHaveBeenCalledTimes(1);
});

test("QubicNodeClient exposes wallet watcher", () => {
  const client = new QubicNodeClient({
    liveClient: liveClientMock,
    queryClient: queryClientMock,
  });
  const watcher = client.watchWallet("A".repeat(60));
  expect(watcher).toBeTruthy();
});
