import { DEFAULT_LIVE_BASE_URL, DEFAULT_REQUEST_TIMEOUT_MS } from "@src/config";
import type {
  BalanceResponse,
  BlockHeightResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  QuerySmartContractRequest,
  QuerySmartContractResponse,
  TickInfoResponse,
} from "@types";
import {
  BalanceResponseSchema,
  BlockHeightResponseSchema,
  BroadcastTransactionResponseSchema,
  TickInfoResponseSchema,
} from "@types";
import type { HttpClientOptions } from "./baseClient";
import { HttpClient } from "./baseClient";

export interface LiveServiceClientOptions extends HttpClientOptions {}

export class LiveServiceClient extends HttpClient {
  constructor(options: LiveServiceClientOptions = {}) {
    super({
      baseUrl: options.baseUrl ?? DEFAULT_LIVE_BASE_URL,
      timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      headers: options.headers,
      fetchImpl: options.fetchImpl,
    });
  }

  getTickInfo(): Promise<TickInfoResponse> {
    return this.get("/v1/tick-info", TickInfoResponseSchema);
  }

  getBalance(identity: string): Promise<BalanceResponse> {
    return this.get(`/v1/balances/${identity}`, BalanceResponseSchema);
  }

  getBlockHeight(): Promise<BlockHeightResponse> {
    return this.get("/v1/block-height", BlockHeightResponseSchema);
  }

  getAssetsIssuedBy(identity: string) {
    return this.get(`/v1/assets/${identity}/issued`);
  }

  getAssetsOwnedBy(identity: string) {
    return this.get(`/v1/assets/${identity}/owned`);
  }

  getAssetsPossessedBy(identity: string) {
    return this.get(`/v1/assets/${identity}/possessed`);
  }

  broadcastTransaction(
    payload: BroadcastTransactionRequest,
  ): Promise<BroadcastTransactionResponse> {
    return this.post("/v1/broadcast-transaction", payload, BroadcastTransactionResponseSchema);
  }

  querySmartContract(payload: QuerySmartContractRequest): Promise<QuerySmartContractResponse> {
    return this.post("/v1/querySmartContract", payload);
  }
}
