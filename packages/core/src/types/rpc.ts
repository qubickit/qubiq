import { z } from "zod";

const nonNegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();
const nonEmptyString = z.string().min(1);

const IDENTITY_PATTERN = /^[A-Z]{60}$/;
const HASH_PATTERN = /^[a-z]{60}$/;
const PRIVATE_KEY_PATTERN = /^[a-z]{55}$/;

export const IdentityStringSchema = z
  .string()
  .regex(IDENTITY_PATTERN, "identity must be 60 uppercase letters");
export const HashStringSchema = z.string().regex(HASH_PATTERN, "hash must be 60 lowercase letters");
export const PrivateKeyStringSchema = z
  .string()
  .regex(PRIVATE_KEY_PATTERN, "private key must be 55 lowercase letters");

export const TickInfoSchema = z.object({
  tick: nonNegativeInt,
  duration: nonNegativeInt,
  epoch: nonNegativeInt,
  initialTick: nonNegativeInt,
});
export type TickInfo = z.infer<typeof TickInfoSchema>;

export const TickInfoResponseSchema = z.object({
  tickInfo: TickInfoSchema,
});
export type TickInfoResponse = z.infer<typeof TickInfoResponseSchema>;

export const BalanceRecordSchema = z.object({
  id: IdentityStringSchema,
  balance: nonEmptyString,
  validForTick: nonNegativeInt,
  latestIncomingTransferTick: nonNegativeInt,
  latestOutgoingTransferTick: nonNegativeInt,
  incomingAmount: nonEmptyString,
  outgoingAmount: nonEmptyString,
  numberOfIncomingTransfers: nonNegativeInt,
  numberOfOutgoingTransfers: nonNegativeInt,
});
export type BalanceRecord = z.infer<typeof BalanceRecordSchema>;

export const BalanceResponseSchema = z.object({
  balance: BalanceRecordSchema,
});
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

const AssetEntrySchema = z
  .object({
    assetId: z.string().optional(),
    amount: nonEmptyString.optional(),
  })
  .passthrough();

export const IssuedAssetsResponseSchema = z.object({
  issuedAssets: z.array(AssetEntrySchema),
});
export type IssuedAssetsResponse = z.infer<typeof IssuedAssetsResponseSchema>;

export const OwnedAssetsResponseSchema = z.object({
  ownedAssets: z.array(AssetEntrySchema),
});
export type OwnedAssetsResponse = z.infer<typeof OwnedAssetsResponseSchema>;

export const PossessedAssetsResponseSchema = z.object({
  possessedAssets: z.array(AssetEntrySchema),
});
export type PossessedAssetsResponse = z.infer<typeof PossessedAssetsResponseSchema>;

export const BroadcastTransactionResponseSchema = z.object({
  transactionId: nonEmptyString,
  encodedTransaction: z.string().optional(),
  peersBroadcasted: z.number().int().nonnegative().optional(),
});
export type BroadcastTransactionResponse = z.infer<typeof BroadcastTransactionResponseSchema>;

export const BlockHeightResponseSchema = z.object({
  blockHeight: nonNegativeInt,
});
export type BlockHeightResponse = z.infer<typeof BlockHeightResponseSchema>;

export interface BroadcastTransactionRequest {
  encodedTransaction: string;
  metadata?: Record<string, unknown>;
}

export interface QuerySmartContractRequest {
  contractIndex: number;
  inputType: number;
  inputSize: number;
  requestData: string;
}

export interface QuerySmartContractResponse {
  responseData: string;
}

export const ArchiveTransactionSchema = z.object({
  id: nonEmptyString,
  hash: HashStringSchema,
  source: IdentityStringSchema,
  destination: IdentityStringSchema,
  tick: nonNegativeInt,
  timestamp: nonEmptyString,
  amount: nonEmptyString,
  inputType: nonNegativeInt,
  inputSize: nonNegativeInt,
  inputData: z.string().optional(),
  signature: z.string().optional(),
  moneyFlew: z.boolean().optional(),
});
export type ArchiveTransaction = z.infer<typeof ArchiveTransactionSchema>;

export const ArchiveTransactionResponseSchema = z.object({
  transaction: ArchiveTransactionSchema,
});
export type ArchiveTransactionResponse = z.infer<typeof ArchiveTransactionResponseSchema>;

export const IdentityTransferRecordSchema = z.object({
  source: IdentityStringSchema,
  destination: IdentityStringSchema,
  amount: nonEmptyString,
  tick: nonNegativeInt,
  hash: HashStringSchema,
});
export type IdentityTransferRecord = z.infer<typeof IdentityTransferRecordSchema>;

export const IdentityTransfersResponseSchema = z.object({
  identity: IdentityStringSchema,
  transfers: z.array(IdentityTransferRecordSchema),
});
export type IdentityTransfersResponse = z.infer<typeof IdentityTransfersResponseSchema>;

export const TickTransactionsResponseSchema = z.object({
  tickNumber: nonNegativeInt,
  transactions: z.array(ArchiveTransactionSchema),
});
export type TickTransactionsResponse = z.infer<typeof TickTransactionsResponseSchema>;

export const TransactionStatusResponseSchema = z.object({
  txId: nonEmptyString,
  status: nonEmptyString,
  tickNumber: nonNegativeInt.optional(),
});
export type TransactionStatusResponse = z.infer<typeof TransactionStatusResponseSchema>;

export const EpochComputorsResponseSchema = z.object({
  epoch: nonNegativeInt,
  computors: z.array(nonEmptyString),
});
export type EpochComputorsResponse = z.infer<typeof EpochComputorsResponseSchema>;

export const QueryServiceTickResponseSchema = z.object({
  tickNumber: nonNegativeInt,
  epoch: nonNegativeInt,
  intervalInitialTick: nonNegativeInt,
});
export type QueryServiceTickResponse = z.infer<typeof QueryServiceTickResponseSchema>;

export const ProcessedTickIntervalSchema = z.object({
  epoch: nonNegativeInt,
  firstTick: nonNegativeInt,
  lastTick: nonNegativeInt,
});
export type ProcessedTickInterval = z.infer<typeof ProcessedTickIntervalSchema>;

export const ComputorsListSchema = z.object({
  epoch: nonNegativeInt,
  tickNumber: nonNegativeInt,
  identities: z.array(IdentityStringSchema),
  signature: z.string().optional(),
});
export type ComputorsList = z.infer<typeof ComputorsListSchema>;

export const QueryServiceTickDataSchema = z.object({
  tickNumber: nonNegativeInt,
  epoch: nonNegativeInt,
  computorIndex: nonNegativeInt,
  timestamp: nonEmptyString,
  varStruct: z.string().optional(),
  timeLock: z.string().optional(),
  transactionHashes: z.array(HashStringSchema).optional(),
  contractFees: z.array(nonEmptyString).optional(),
  signature: z.string().optional(),
});
export type QueryServiceTickData = z.infer<typeof QueryServiceTickDataSchema>;

export type QueryServiceTransaction = ArchiveTransaction;

export const QueryTickDataResponseSchema = z.object({
  tickData: QueryServiceTickDataSchema,
});
export type QueryTickDataResponse = z.infer<typeof QueryTickDataResponseSchema>;

export const RangeFilterSchema = z.object({
  from: z.number().optional(),
  to: z.number().optional(),
});
export type RangeFilter = z.infer<typeof RangeFilterSchema>;

export const PaginationOptionsSchema = z.object({
  page: nonNegativeInt.optional(),
  pageSize: positiveInt.optional(),
});
export type PaginationOptions = z.infer<typeof PaginationOptionsSchema>;

export const QueryTransactionsByIdentityRequestSchema = z.object({
  identity: IdentityStringSchema,
  limit: positiveInt.optional(),
  page: nonNegativeInt.optional(),
});
export type QueryTransactionsByIdentityRequest = z.infer<
  typeof QueryTransactionsByIdentityRequestSchema
>;

export const QueryTransactionsByHashRequestSchema = z.object({
  hash: HashStringSchema,
});
export type QueryTransactionsByHashRequest = z.infer<typeof QueryTransactionsByHashRequestSchema>;

export const QueryTransactionsByTickRequestSchema = z.object({
  tickNumber: nonNegativeInt,
});
export type QueryTransactionsByTickRequest = z.infer<typeof QueryTransactionsByTickRequestSchema>;

export const QueryComputorListRequestSchema = z.object({
  epoch: nonNegativeInt,
});
export type QueryComputorListRequest = z.infer<typeof QueryComputorListRequestSchema>;

export const ComputorListsResponseSchema = z.object({
  computorsLists: z.array(ComputorsListSchema),
});
export type ComputorListsResponse = z.infer<typeof ComputorListsResponseSchema>;

export const QueryTickDataRequestSchema = z.object({
  tickNumber: nonNegativeInt,
});
export type QueryTickDataRequest = z.infer<typeof QueryTickDataRequestSchema>;

export const QueryTransactionsForTickResponseSchema = z.object({
  transactions: z.array(ArchiveTransactionSchema),
});
export type QueryTransactionsForTickResponse = z.infer<
  typeof QueryTransactionsForTickResponseSchema
>;

export const TransactionsForIdentityResponseSchema = z.object({
  validForTick: nonNegativeInt.optional(),
  hits: z
    .object({
      total: nonNegativeInt.optional(),
      page: nonNegativeInt.optional(),
      pageSize: nonNegativeInt.optional(),
    })
    .optional(),
  transactions: z.array(ArchiveTransactionSchema),
});
export type TransactionsForIdentityResponse = z.infer<typeof TransactionsForIdentityResponseSchema>;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
