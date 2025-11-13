import {
  DEFAULT_QUERY_SERVICE_BASE_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from "../../config";
import {
  ComputorListsResponseSchema,
  QueryComputorListRequestSchema,
  QueryServiceTickResponseSchema,
  QueryTickDataRequestSchema,
  QueryTickDataResponseSchema,
  QueryTransactionsByHashRequestSchema,
  QueryTransactionsByIdentityRequestSchema,
  QueryTransactionsByTickRequestSchema,
  QueryTransactionsForTickResponseSchema,
  TransactionsForIdentityResponseSchema,
  ArchiveTransactionSchema,
} from "../../types";
import type {
  ComputorsList,
  ProcessedTickInterval,
  QueryComputorListRequest,
  QueryServiceTickData,
  QueryServiceTickResponse,
  QueryTickDataRequest,
  QueryTickDataResponse,
  QueryTransactionsByHashRequest,
  QueryTransactionsByIdentityRequest,
  QueryTransactionsByTickRequest,
  QueryTransactionsForTickResponse,
  QueryServiceTransaction,
  TransactionsForIdentityResponse,
} from "../../types";
import { ProcessedTickIntervalSchema } from "../../types";
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
    return this.get("/getLastProcessedTick", QueryServiceTickResponseSchema);
  }

  getProcessedTickIntervals(): Promise<ProcessedTickInterval[]> {
    return this.get(
      "/getProcessedTickIntervals",
      ProcessedTickIntervalSchema.array(),
    );
  }

  getTickData(
    payload: QueryTickDataRequest,
  ): Promise<QueryTickDataResponse> {
    return this.post("/getTickData", payload, QueryTickDataResponseSchema);
  }

  getTransactionByHash(
    payload: QueryTransactionsByHashRequest,
  ): Promise<QueryServiceTransaction> {
    return this.post(
      "/getTransactionByHash",
      payload,
      ArchiveTransactionSchema,
    );
  }

  getTransactionsForIdentity(
    payload: QueryTransactionsByIdentityRequest,
  ): Promise<TransactionsForIdentityResponse> {
    return this.post(
      "/getTransactionsForIdentity",
      payload,
      TransactionsForIdentityResponseSchema,
    );
  }

  getTransactionsForTick(
    payload: QueryTransactionsByTickRequest,
  ): Promise<QueryTransactionsForTickResponse> {
    return this.post(
      "/getTransactionsForTick",
      payload,
      QueryTransactionsForTickResponseSchema,
    );
  }

  getComputorListsForEpoch(
    payload: QueryComputorListRequest,
  ): Promise<{ computorsLists: ComputorsList[] }> {
    return this.post(
      "/getComputorListsForEpoch",
      payload,
      ComputorListsResponseSchema,
    );
  }
}
