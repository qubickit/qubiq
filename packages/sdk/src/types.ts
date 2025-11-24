import type {
  AutomationProfileInput,
  AutomationRuntime,
  AutomationRuntimeOptions,
  BroadcastTransactionResponse,
  ClientConfig,
  EncryptedSecret,
  SignedTransfer,
  Wallet,
  createClients,
} from "@qubiq/core";
import type { AutomationEventBus } from "./automation";
import type { ContractToolkit } from "./contracts";
import type { ProposalToolkit } from "./proposals";
import type { TransferRequest } from "./transfers";
import type { WalletConfig, WalletTools } from "./wallet";

export interface AutomationOptions {
  profile: AutomationProfileInput;
  runtimeOptions?: AutomationRuntimeOptions;
  autoStart?: boolean;
  eventBus?: AutomationEventBus | boolean;
}

export interface QubiQSdkOptions {
  seed?: string;
  wallet?: Wallet;
  walletConfig?: WalletConfig;
  encryptedSeed?: EncryptedSecret;
  passphrase?: string;
  hdPath?: string;
  minTickOffset?: number;
  maxTickOffset?: number;
  clientConfig?: ClientConfig;
  automation?: AutomationOptions | false;
}

export interface AutomationController {
  runtime: AutomationRuntime;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type SdkClients = ReturnType<typeof createClients>;

export interface QubiQSdk {
  clients: SdkClients;
  wallet?: Wallet;
  walletTools?: WalletTools;
  automation?: AutomationController;
  contracts: ContractToolkit;
  proposals: ProposalToolkit;
  sendTransfer(request: TransferRequest): Promise<BroadcastTransactionResponse>;
  sendTransferBatch(requests: TransferRequest[]): Promise<BroadcastTransactionResponse[]>;
  prepareTransfer(request: TransferRequest): Promise<SignedTransfer>;
}

export type EncryptSeedResult = EncryptedSecret;

export type SdkEventBusConfig =
  | { type: "console" }
  | { type: "webhook"; endpoint: string; headers?: Record<string, string> };

export interface SdkAutomationConfig {
  profile: AutomationProfileInput;
  runtimeOptions?: AutomationRuntimeOptions;
  autoStart?: boolean;
  eventBus?: SdkEventBusConfig | boolean;
}

export interface SdkConfigFile {
  wallet?: WalletConfig;
  client?: ClientConfig;
  automation?: SdkAutomationConfig | false;
}
