import { expect, mock, test } from "bun:test";

import { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { BroadcastTransactionRequest } from "@types";

const baseUrl = "https://mock.live";

function buildResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createFetchMock(): typeof fetch {
  return mock(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/v1/tick-info")) {
      return buildResponse({
        tickInfo: { tick: 1, duration: 1000, epoch: 10, initialTick: 0 },
      });
    }
    if (url.includes("/v1/balances/")) {
      return buildResponse({
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
      });
    }
    if (url.endsWith("/v1/broadcast-transaction")) {
      return buildResponse({ transactionId: "abc123" });
    }
    return buildResponse({ message: "not found" }, 404);
  }) as unknown as typeof fetch;
}

test("LiveServiceClient parses tick info and balance responses", async () => {
  const fetchMock = createFetchMock();
  const client = new LiveServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  const tickInfo = await client.getTickInfo();
  expect(tickInfo.tickInfo.tick).toBe(1);

  const balance = await client.getBalance("A".repeat(60));
  expect(balance.balance.balance).toBe("1000");
});

test("LiveServiceClient validates broadcast response", async () => {
  const fetchMock = createFetchMock();
  const client = new LiveServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  const payload: BroadcastTransactionRequest = {
    encodedTransaction: "Zm9v",
  };

  const result = await client.broadcastTransaction(payload);
  expect(result.transactionId).toBe("abc123");
});

test("LiveServiceClient rejects malformed responses", async () => {
  const fetchMock = mock(async () =>
    buildResponse({ tickInfo: { tick: -1 } }),
  ) as unknown as typeof fetch;
  const client = new LiveServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  await expect(client.getTickInfo()).rejects.toThrow();
});
