import { expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ServerUnaryCall,
  ServiceDefinition,
  sendUnaryData,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { loadPackageDefinition, Server, ServerCredentials } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

import { LiveServiceGrpcClient } from "@interop";
import type { BalanceResponse, BroadcastTransactionResponse, TickInfoResponse } from "@types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, "../../proto/qubic/live_service.proto");

const packageDefinition = loadSync(PROTO_PATH, { keepCase: true, longs: String, defaults: true });
const grpcObject = loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

interface ProtoGrpcType {
  qubic?: {
    live?: {
      QubicLiveService?: {
        service: ServiceDefinition<UntypedServiceImplementation>;
      };
    };
  };
}

function createMockServer() {
  const server = new Server();
  const serviceDef = grpcObject.qubic?.live?.QubicLiveService?.service;
  if (!serviceDef) {
    throw new Error("Missing QubicLiveService definition");
  }
  server.addService(serviceDef, {
    GetTickInfo(
      _: ServerUnaryCall<Record<string, never>, TickInfoResponse>,
      callback: sendUnaryData<TickInfoResponse>,
    ) {
      callback(null, { tickInfo: { tick: 123, epoch: 5, duration: 1000, initialTick: 0 } });
    },
    GetBalance(
      call: ServerUnaryCall<{ identity: string }, BalanceResponse>,
      callback: sendUnaryData<BalanceResponse>,
    ) {
      callback(null, {
        balance: {
          id:
            call.request.identity || "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
          balance: "1000",
          incomingAmount: "500",
          outgoingAmount: "400",
          numberOfIncomingTransfers: 2,
          numberOfOutgoingTransfers: 1,
          latestIncomingTransferTick: 50,
          latestOutgoingTransferTick: 40,
          validForTick: 123,
        },
      });
    },
    BroadcastTransaction(
      _: ServerUnaryCall<unknown, BroadcastTransactionResponse>,
      callback: sendUnaryData<BroadcastTransactionResponse>,
    ) {
      callback(null, { transactionId: "abc" });
    },
  });
  return server;
}

test("LiveServiceGrpcClient invokes RPCs", async () => {
  const server = createMockServer();
  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync(
      "127.0.0.1:0",
      ServerCredentials.createInsecure(),
      (error: Error | null, boundPort?: number) => {
        if (error || typeof boundPort !== "number") {
          reject(error ?? new Error("failed to bind"));
        } else {
          resolve(boundPort);
        }
      },
    );
  });
  server.start();

  const client = new LiveServiceGrpcClient({ address: `127.0.0.1:${port}` });

  const tickInfo = await client.getTickInfo();
  expect(tickInfo.tickInfo?.tick).toBe(123);

  const balance = await client.getBalance("SUZ...");
  expect(balance.balance?.balance).toBe("1000");

  const broadcast = await client.broadcastTransaction({ encodedTransaction: "abcd" });
  expect(broadcast.transactionId).toBe("abc");

  client.close();
  await new Promise<void>((resolve, reject) => {
    server.tryShutdown((error?: Error | null) => {
      if (error) reject(error);
      else resolve();
    });
  });
});
