import { DEFAULT_ARCHIVE_BASE_URL, DEFAULT_REQUEST_TIMEOUT_MS } from "@src/config";
import type {
  ArchiveTransactionResponse,
  EpochComputorsResponse,
  IdentityTransfersResponse,
  TickTransactionsResponse,
  TransactionStatusResponse,
} from "@types";
import type { HttpClientOptions } from "./baseClient";
import { HttpClient } from "./baseClient";

export interface ArchiveClientOptions extends HttpClientOptions {}

export class ArchiveClient extends HttpClient {
  constructor(options: ArchiveClientOptions = {}) {
    super({
      baseUrl: options.baseUrl ?? DEFAULT_ARCHIVE_BASE_URL,
      timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      headers: options.headers,
      fetchImpl: options.fetchImpl,
    });
  }

  getEpochComputors(epoch: number): Promise<EpochComputorsResponse> {
    return this.get(`/v1/epochs/${epoch}/computors`);
  }

  getTickTransactions(tickNumber: number): Promise<TickTransactionsResponse> {
    return this.get(`/v1/ticks/${tickNumber}/transactions`);
  }

  getTickTransferTransactions(tickNumber: number): Promise<TickTransactionsResponse> {
    return this.get(`/v1/ticks/${tickNumber}/transfer-transactions`);
  }

  getTransaction(txId: string): Promise<ArchiveTransactionResponse> {
    return this.get(`/v1/transactions/${txId}`);
  }

  getTransactionStatus(txId: string): Promise<TransactionStatusResponse> {
    return this.get(`/v1/tx-status/${txId}`);
  }

  getIdentityTransfers(identity: string): Promise<IdentityTransfersResponse> {
    return this.get(`/v1/identities/${identity}/transfer-transactions`);
  }
}
