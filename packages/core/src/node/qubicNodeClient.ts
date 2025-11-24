import { LiveServiceClient } from "@clients/http/liveServiceClient";
import { QueryServiceClient } from "@clients/http/queryServiceClient";
import { ProposalCoordinator, type ProposalSource } from "@proposals/proposalCoordinator";
import type { ClientConfig } from "@src/config";
import { DEFAULT_LIVE_BASE_URL, DEFAULT_QUERY_SERVICE_BASE_URL } from "@src/config";
import type {
  BalanceResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  QueryServiceTickResponse,
  QueryTransactionsByHashRequest,
  QueryTransactionsByIdentityRequest,
  QueryTransactionsByTickRequest,
  QueryTransactionsForTickResponse,
  TransactionsForIdentityResponse,
} from "@types";
import type { WalletWatcherOptions } from "@wallet/watcher";
import { WalletWatcher } from "@wallet/watcher";

export interface QubicNodeClientOptions extends ClientConfig {
  liveClient?: LiveServiceClient;
  queryClient?: QueryServiceClient;
}

export class QubicNodeClient {
  private readonly live: LiveServiceClient;
  private readonly query: QueryServiceClient;

  constructor(options: QubicNodeClientOptions = {}) {
    this.live =
      options.liveClient ??
      new LiveServiceClient({ baseUrl: options.liveBaseUrl ?? DEFAULT_LIVE_BASE_URL });
    this.query =
      options.queryClient ??
      new QueryServiceClient({
        baseUrl:
          options.queryServiceBaseUrl ?? options.liveBaseUrl ?? DEFAULT_QUERY_SERVICE_BASE_URL,
      });
  }

  getTickInfo() {
    return this.live.getTickInfo();
  }

  getBalance(identity: string): Promise<BalanceResponse> {
    return this.live.getBalance(identity);
  }

  broadcastTransaction(
    payload: BroadcastTransactionRequest,
  ): Promise<BroadcastTransactionResponse> {
    return this.live.broadcastTransaction(payload);
  }

  getLastProcessedTick(): Promise<QueryServiceTickResponse> {
    return this.query.getLastProcessedTick();
  }

  getTransactionsForIdentity(
    payload: QueryTransactionsByIdentityRequest,
  ): Promise<TransactionsForIdentityResponse> {
    return this.query.getTransactionsForIdentity(payload);
  }

  getTransactionsForTick(
    payload: QueryTransactionsByTickRequest,
  ): Promise<QueryTransactionsForTickResponse> {
    return this.query.getTransactionsForTick(payload);
  }

  getTransactionByHash(payload: QueryTransactionsByHashRequest) {
    return this.query.getTransactionByHash(payload);
  }

  watchWallet(identity: string, options: Omit<WalletWatcherOptions, "identity"> = {}) {
    return new WalletWatcher({
      identity,
      pollIntervalMs: options.pollIntervalMs,
      client: this.live,
    });
  }

  createProposalCoordinator(source: ProposalSource) {
    return new ProposalCoordinator(source);
  }
}
