import { expect, mock, test } from "bun:test";

import { QueryServiceClient } from "@clients/http/queryServiceClient";
import type { QueryTransactionsByIdentityRequest } from "@types";

const baseUrl = "https://mock.query";

function buildResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createFetchMock(): typeof fetch {
  return mock(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/getLastProcessedTick")) {
      return buildResponse({
        tickNumber: 10,
        epoch: 2,
        intervalInitialTick: 0,
      });
    }
    if (url.endsWith("/getTransactionsForIdentity")) {
      return buildResponse({
        validForTick: 10,
        transactions: [
          {
            id: "tx1",
            hash: "a".repeat(60),
            source: "A".repeat(60),
            destination: "B".repeat(60),
            tick: 10,
            timestamp: "123",
            amount: "100",
            inputType: 0,
            inputSize: 0,
          },
        ],
      });
    }
    return buildResponse({ message: "not found" }, 404);
  }) as unknown as typeof fetch;
}

test("QueryServiceClient retrieves last processed tick", async () => {
  const fetchMock = createFetchMock();
  const client = new QueryServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  const tick = await client.getLastProcessedTick();
  expect(tick.tickNumber).toBe(10);
});

test("QueryServiceClient parses transactions for identity", async () => {
  const fetchMock = createFetchMock();
  const client = new QueryServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  const payload: QueryTransactionsByIdentityRequest = {
    identity: "A".repeat(60),
  };
  const response = await client.getTransactionsForIdentity(payload);
  expect(response.transactions[0]?.hash).toBe("a".repeat(60));
});

test("QueryServiceClient rejects invalid tick response", async () => {
  const fetchMock = mock(async () =>
    buildResponse({ tickNumber: -1, epoch: 0, intervalInitialTick: 0 }),
  ) as unknown as typeof fetch;
  const client = new QueryServiceClient({
    baseUrl,
    fetchImpl: fetchMock,
  });

  await expect(client.getLastProcessedTick()).rejects.toThrow();
});
