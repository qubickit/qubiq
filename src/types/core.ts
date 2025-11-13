/**
 * Low level Qubic data structures derived from the canonical C++ node.
 * They are used purely for modeling and documentation in this TypeScript toolkit.
 */

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
export interface RequestResponseHeader {
  /** Raw 24-bit payload size (header excluded) */
  size: number;
  /** Numerical message type enumeration */
  type: MessageType;
  /** Dejavu identifier used for deduplication */
  dejavu: number;
}

/** Generic representation of a network message. */
export interface NetworkMessage<TPayload = unknown> {
  header: RequestResponseHeader;
  payload: TPayload;
}

/** Canonical transaction layout (80 byte header + payload + signature). */
export interface Transaction {
  sourcePublicKey: string; // 32-byte hex string
  destinationPublicKey: string; // 32-byte hex string
  amount: bigint;
  tick: number;
  inputType: number;
  inputSize: number;
  inputData?: Uint8Array;
  signature: string; // 64-byte hex string
}

/** Qubic entity ledger snapshot. */
export interface EntityRecord {
  publicKey: string;
  incomingAmount: bigint;
  outgoingAmount: bigint;
  numberOfIncomingTransfers: number;
  numberOfOutgoingTransfers: number;
  latestIncomingTransferTick: number;
  latestOutgoingTransferTick: number;
}

/** Shareholder proposal metadata modeled after ProposalTypes in C++. */
export enum ProposalClass {
  GeneralOptions = 0x000,
  Transfer = 0x100,
  Variable = 0x200,
  MultiVariables = 0x300,
  TransferInEpoch = 0x400,
}

export interface ProposalVariableOptions {
  variable: number;
  value: number;
}

export interface ProposalTransferOptions {
  destination: string;
  amount: bigint;
}

export interface ProposalData {
  epoch: number;
  type: number;
  description?: string;
  variableOptions?: ProposalVariableOptions;
  transferOptions?: ProposalTransferOptions;
  options?: string[];
}

export interface ShareholderProposal {
  index: number;
  data: ProposalData;
  acceptedOption?: number;
  acceptedValue?: number | bigint;
}

export interface ShareholderProposalFees {
  setProposalFee: bigint;
  setVoteFee: bigint;
}

export interface ProposalIndicesRequest {
  activeProposals: boolean;
  prevProposalIndex: number;
}

export interface ProposalIndicesResponse {
  numOfIndices: number;
  indices: number[];
}

export interface ShareholderVotingSummary {
  proposalIndex: number;
  acceptedOption: number;
  quorumReached: boolean;
}
