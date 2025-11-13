import {
  DEFAULT_QUERY_SERVICE_BASE_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "../../config";
import type {
  ComputorsList,
  ProcessedTickInterval,
  QueryComputorListRequest,
  QueryServiceTickData,
  QueryServiceTickResponse,
  QueryTickDataRequest,
  QueryTransactionsByHashRequest,
  QueryTransactionsByIdentityRequest,
  QueryTransactionsByTickRequest,
  QueryTransactionsForTickResponse,
  QueryServiceTransaction,
  TransactionsForIdentityResponse,
} from "../../types";
import { HttpClient } from "./baseClient";
import type { HttpClientOptions } from "./baseClient";

export interface QueryServiceClientOptions extends HttpClientOptions {}

export class QueryServiceClient extends HttpClient {
  constructor(options: QueryServiceClientOptions = {}) {
    super({
      baseUrl: options.baseUrl ?? DEFAULT_QUERY_SERVICE_BASE_URL,
      timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      headers: options.headers,
      fetchImpl: options.fetchImpl,
    });
  }

  getLastProcessedTick(): Promise<QueryServiceTickResponse> {
    return this.get("/getLastProcessedTick");
  }

  getProcessedTickIntervals(): Promise<ProcessedTickInterval[]> {
    return this.get("/getProcessedTickIntervals");
  }

  getTickData(
    payload: QueryTickDataRequest
  ): Promise<{ tickData: QueryServiceTickData }> {
    return this.post("/getTickData", payload);
  }

  getTransactionByHash(
    payload: QueryTransactionsByHashRequest
  ): Promise<QueryServiceTransaction> {
    return this.post("/getTransactionByHash", payload);
  }

  getTransactionsForIdentity(
    payload: QueryTransactionsByIdentityRequest
  ): Promise<TransactionsForIdentityResponse> {
    return this.post("/getTransactionsForIdentity", payload);
  }

  getTransactionsForTick(
    payload: QueryTransactionsByTickRequest
  ): Promise<QueryTransactionsForTickResponse> {
    return this.post("/getTransactionsForTick", payload);
  }

  getComputorListsForEpoch(
    payload: QueryComputorListRequest
  ): Promise<{ computorsLists: ComputorsList[] }> {
    return this.post("/getComputorListsForEpoch", payload);
  }
}
