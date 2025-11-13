export interface TickInfo {
  tick: number;
  duration: number;
  epoch: number;
  initialTick: number;
}

export interface TickInfoResponse {
  tickInfo: TickInfo;
}

export interface BalanceRecord {
  id: string;
  balance: string;
  validForTick: number;
  latestIncomingTransferTick: number;
  latestOutgoingTransferTick: number;
  incomingAmount: string;
  outgoingAmount: string;
  numberOfIncomingTransfers: number;
  numberOfOutgoingTransfers: number;
}

export interface BalanceResponse {
  balance: BalanceRecord;
}

export interface BroadcastTransactionResponse {
  transactionId: string;
}

export interface BroadcastTransactionRequest {
  transaction: Uint8Array | string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface QuerySmartContractRequest {
  contractAddress: string;
  functionName: string;
  parameters?: Array<string | number | boolean>;
}

export interface QuerySmartContractResponse<T = unknown> {
  result: T;
}

export interface ArchiveTransaction {
  id: string;
  hash: string;
  source: string;
  destination: string;
  tick: number;
  timestamp: string;
  amount: string;
  inputType: number;
  inputSize: number;
  inputData?: string;
  signature?: string;
  moneyFlew?: boolean;
}

export interface ArchiveTransactionResponse {
  transaction: ArchiveTransaction;
}

export interface IdentityTransferRecord {
  source: string;
  destination: string;
  amount: string;
  tick: number;
  hash: string;
}

export interface IdentityTransfersResponse {
  identity: string;
  transfers: IdentityTransferRecord[];
}

export interface TickTransactionsResponse {
  tickNumber: number;
  transactions: ArchiveTransaction[];
}

export interface TransactionStatusResponse {
  txId: string;
  status: string;
  tickNumber?: number;
}

export interface EpochComputorsResponse {
  epoch: number;
  computors: string[];
}

export interface QueryServiceTickResponse {
  tickNumber: number;
  epoch: number;
  intervalInitialTick: number;
}

export interface ProcessedTickInterval {
  epoch: number;
  firstTick: number;
  lastTick: number;
}

export interface ComputorsList {
  epoch: number;
  tickNumber: number;
  identities: string[];
  signature?: string;
}

export interface QueryServiceTickData {
  tickNumber: number;
  epoch: number;
  computorIndex: number;
  timestamp: string;
  varStruct?: string;
  timeLock?: string;
  transactionHashes?: string[];
  contractFees?: string[];
  signature?: string;
}

export interface QueryServiceTransaction extends ArchiveTransaction {}

export interface QueryTransactionsByIdentityRequest {
  identity: string;
  limit?: number;
  page?: number;
}

export interface RangeFilter {
  from?: number;
  to?: number;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface QueryTransactionsByHashRequest {
  hash: string;
}

export interface QueryTransactionsByTickRequest {
  tickNumber: number;
}

export interface QueryComputorListRequest {
  epoch: number;
}

export interface QueryTickDataRequest {
  tickNumber: number;
}

export interface QueryTransactionsForTickResponse {
  transactions: QueryServiceTransaction[];
}

export interface TransactionsForIdentityResponse {
  validForTick?: number;
  hits?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
  transactions: QueryServiceTransaction[];
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
