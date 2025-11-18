import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ChannelCredentials } from "@grpc/grpc-js";
import { credentials, loadPackageDefinition, Metadata, type ServiceError } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";

import type {
  BalanceResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  TickInfoResponse,
} from "@types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(__dirname, "../../../proto/qubic/live_service.proto");

const packageDefinition = loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
});

const grpcObject = loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
const LiveServiceConstructor = (() => {
  const ctor = grpcObject.qubic?.live?.QubicLiveService;
  if (!ctor) {
    throw new Error("Failed to load QubicLiveService definition from proto");
  }
  return ctor;
})();

type UnaryCallback<TResponse> = (error: ServiceError | null, response: TResponse) => void;

interface ProtoGrpcType {
  qubic?: {
    live?: {
      QubicLiveService?: LiveServiceConstructor;
    };
  };
}

type LiveServiceConstructor = new (
  address: string,
  credentials: ChannelCredentials,
) => RawLiveServiceClient;

interface RawLiveServiceClient {
  GetTickInfo(
    argument: Record<string, never>,
    metadata: Metadata,
    callback: UnaryCallback<TickInfoResponse>,
  ): void;
  GetBalance(
    argument: { identity: string },
    metadata: Metadata,
    callback: UnaryCallback<BalanceResponse>,
  ): void;
  BroadcastTransaction(
    argument: BroadcastTransactionRequest,
    metadata: Metadata,
    callback: UnaryCallback<BroadcastTransactionResponse>,
  ): void;
  close(): void;
}

export interface LiveServiceGrpcClientOptions {
  address: string;
  credentials?: ChannelCredentials;
  metadata?: Metadata;
}

export class LiveServiceGrpcClient {
  private readonly client: RawLiveServiceClient;
  private readonly metadata: Metadata;

  constructor(options: LiveServiceGrpcClientOptions) {
    this.client = new LiveServiceConstructor(
      options.address,
      options.credentials ?? credentials.createInsecure(),
    );
    this.metadata = options.metadata ?? new Metadata();
  }

  async getTickInfo(): Promise<TickInfoResponse> {
    return this.callUnary((metadata, callback) => this.client.GetTickInfo({}, metadata, callback));
  }

  async getBalance(identity: string): Promise<BalanceResponse> {
    return this.callUnary((metadata, callback) =>
      this.client.GetBalance({ identity }, metadata, callback),
    );
  }

  async broadcastTransaction(
    payload: BroadcastTransactionRequest,
  ): Promise<BroadcastTransactionResponse> {
    return this.callUnary((metadata, callback) =>
      this.client.BroadcastTransaction(payload, metadata, callback),
    );
  }

  close() {
    this.client.close();
  }

  private callUnary<T>(fn: (metadata: Metadata, callback: UnaryCallback<T>) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      fn(this.metadata, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}
