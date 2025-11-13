import {
  DEFAULT_LIVE_BASE_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "../../config";
import type {
  BalanceResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  QuerySmartContractRequest,
  QuerySmartContractResponse,
  TickInfoResponse,
} from "../../types";
import { HttpClient } from "./baseClient";
import type { HttpClientOptions } from "./baseClient";

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
    return this.get("/v1/tick-info");
  }

  getBalance(identity: string): Promise<BalanceResponse> {
    return this.get(`/v1/balances/${identity}`);
  }

  getBlockHeight(): Promise<{ blockHeight: number }> {
    return this.get("/v1/block-height");
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
    return this.post("/v1/broadcast-transaction", payload);
  }

  querySmartContract<T = unknown>(
    payload: QuerySmartContractRequest,
  ): Promise<QuerySmartContractResponse<T>> {
    return this.post("/v1/querySmartContract", payload);
  }
}
