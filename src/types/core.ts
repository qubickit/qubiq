import { z } from "zod";

/**
 * Low level Qubic data structures derived from the canonical C++ node.
 * They are used for both compile-time typing and runtime validation via Zod.
 */

const HEX_32_BYTES = /^[0-9a-fA-F]{64}$/;
const HEX_64_BYTES = /^[0-9a-fA-F]{128}$/;
const nonNegativeBigInt = z.bigint().refine((value) => value >= BigInt(0), "value must be >= 0");
const nonNegativeInt = z.number().int().nonnegative();

/** Enumeration of known network message types (subset). */
export enum MessageType {
  EXCHANGE_PUBLIC_PEERS = 0,
  BROADCAST_MESSAGE = 1,
  BROADCAST_COMPUTORS = 2,
  BROADCAST_TICK = 3,
  BROADCAST_FUTURE_TICK_DATA = 8,
  REQUEST_COMPUTORS = 11,
  REQUEST_QUORUM_TICK = 14,
  REQUEST_TICK_DATA = 16,
  BROADCAST_TRANSACTION = 24,
  REQUEST_TRANSACTION_INFO = 26,
  REQUEST_CURRENT_TICK_INFO = 27,
  RESPOND_CURRENT_TICK_INFO = 28,
  REQUEST_TICK_TRANSACTIONS = 29,
  REQUEST_ENTITY = 31,
  RESPOND_ENTITY = 32,
  REQUEST_CONTRACT_IPO = 33,
  RESPOND_CONTRACT_IPO = 34,
  END_RESPONSE = 35,
  REQUEST_ISSUED_ASSETS = 36,
  RESPOND_ISSUED_ASSETS = 37,
  REQUEST_OWNED_ASSETS = 38,
  RESPOND_OWNED_ASSETS = 39,
  REQUEST_POSSESSED_ASSETS = 40,
  RESPOND_POSSESSED_ASSETS = 41,
  REQUEST_CONTRACT_FUNCTION = 42,
  RESPOND_CONTRACT_FUNCTION = 43,
  REQUEST_LOG = 44,
  RESPOND_LOG = 45,
  REQUEST_SYSTEM_INFO = 46,
  RESPOND_SYSTEM_INFO = 47,
  TRY_AGAIN = 54,
  REQUEST_CUSTOM_MINING_DATA = 60,
  RESPOND_CUSTOM_MINING_DATA = 61,
  REQUEST_CUSTOM_MINING_SOLUTION_VERIFICATION = 62,
  RESPOND_CUSTOM_MINING_SOLUTION_VERIFICATION = 63,
  SPECIAL_COMMAND = 255,
}

/** 24-bit sized wire header used by every TCP message. */
export const RequestResponseHeaderSchema = z.object({
  /** Raw 24-bit payload size (header excluded) */
  size: nonNegativeInt.max(0xffffff),
  /** Numerical message type enumeration */
  type: z.nativeEnum(MessageType),
  /** Dejavu identifier used for deduplication */
  dejavu: z.number().int().positive(),
});

export type RequestResponseHeader = z.infer<typeof RequestResponseHeaderSchema>;

/** Generic representation of a network message. */
export interface NetworkMessage<TPayload = unknown> {
  header: RequestResponseHeader;
  payload: TPayload;
}

/** Canonical transaction layout (80 byte header + payload + signature). */
export const TransactionSchema = z.object({
  sourcePublicKey: z.string().regex(HEX_32_BYTES, "sourcePublicKey must be 32-byte hex"),
  destinationPublicKey: z.string().regex(HEX_32_BYTES, "destinationPublicKey must be 32-byte hex"),
  amount: nonNegativeBigInt,
  tick: nonNegativeInt,
  inputType: nonNegativeInt.max(0xffff),
  inputSize: nonNegativeInt.max(0xffff),
  inputData: z.instanceof(Uint8Array).optional(),
  signature: z.string().regex(HEX_64_BYTES, "signature must be 64-byte (128 hex chars)"),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/** Qubic entity ledger snapshot. */
export const EntityRecordSchema = z.object({
  publicKey: z.string().regex(HEX_32_BYTES, "publicKey must be 32-byte hex"),
  incomingAmount: nonNegativeBigInt,
  outgoingAmount: nonNegativeBigInt,
  numberOfIncomingTransfers: nonNegativeInt,
  numberOfOutgoingTransfers: nonNegativeInt,
  latestIncomingTransferTick: nonNegativeInt,
  latestOutgoingTransferTick: nonNegativeInt,
});

export type EntityRecord = z.infer<typeof EntityRecordSchema>;

/** Shareholder proposal metadata modeled after ProposalTypes in C++. */
export enum ProposalClass {
  GeneralOptions = 0x000,
  Transfer = 0x100,
  Variable = 0x200,
  MultiVariables = 0x300,
  TransferInEpoch = 0x400,
}

export const ProposalVariableOptionsSchema = z.object({
  variable: nonNegativeInt,
  value: z.number().int(),
});

export type ProposalVariableOptions = z.infer<typeof ProposalVariableOptionsSchema>;

export const ProposalTransferOptionsSchema = z.object({
  destination: z.string().regex(HEX_32_BYTES, "destination must be 32-byte hex"),
  amount: nonNegativeBigInt,
});

export type ProposalTransferOptions = z.infer<typeof ProposalTransferOptionsSchema>;

export const ProposalDataSchema = z.object({
  epoch: nonNegativeInt,
  type: nonNegativeInt,
  description: z.string().max(1024).optional(),
  variableOptions: ProposalVariableOptionsSchema.optional(),
  transferOptions: ProposalTransferOptionsSchema.optional(),
  options: z.array(z.string()).max(8).optional(),
});

export type ProposalData = z.infer<typeof ProposalDataSchema>;

export const ShareholderProposalSchema = z.object({
  index: nonNegativeInt,
  data: ProposalDataSchema,
  acceptedOption: z.number().int().optional(),
  acceptedValue: z.union([z.number(), z.bigint()]).optional(),
});

export type ShareholderProposal = z.infer<typeof ShareholderProposalSchema>;

export const ShareholderProposalFeesSchema = z.object({
  setProposalFee: nonNegativeBigInt,
  setVoteFee: nonNegativeBigInt,
});

export type ShareholderProposalFees = z.infer<typeof ShareholderProposalFeesSchema>;

export const ProposalIndicesRequestSchema = z.object({
  activeProposals: z.boolean(),
  prevProposalIndex: z.number().int().default(-1),
});

export type ProposalIndicesRequest = z.infer<typeof ProposalIndicesRequestSchema>;

export const ProposalIndicesResponseSchema = z.object({
  numOfIndices: z.number().int().min(0).max(64),
  indices: z.array(z.number().int()).max(64),
});

export type ProposalIndicesResponse = z.infer<typeof ProposalIndicesResponseSchema>;

export const ShareholderVotingSummarySchema = z.object({
  proposalIndex: z.number().int(),
  acceptedOption: z.number().int(),
  quorumReached: z.boolean(),
});

export type ShareholderVotingSummary = z.infer<typeof ShareholderVotingSummarySchema>;
