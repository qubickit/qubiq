import type {
  AutomationRuntime,
  AutomationRuntimeOptions,
  BalanceSnapshot,
  BroadcastTransactionResponse,
  CcfProposalFetchResult,
  SignedTransfer,
  TickSample,
  Wallet,
  WalletWatcherEventMap,
} from "@qubiq/core";
import {
  createAutomationRuntime,
  createClients,
} from "@qubiq/core";
import type { AutomationEvent, AutomationEventBus } from "./automation";
import { ConsoleAutomationEventBus, WebhookAutomationEventBus } from "./automation";
import type { ContractToolkit } from "./contracts";
import {
  createContractToolkit,
  decodeStruct,
  encodeStruct,
  type ContractCall,
  type ContractCallResult,
  type ContractBinding,
  type ContractFunctionBinding,
  type ContractProcedureBinding,
} from "./contracts";
import type { ProposalToolkit } from "./proposals";
import { createProposalToolkit } from "./proposals";
import type { WalletResolution as WalletResolutionType } from "./wallet";
import { createWalletTools, resolveWallet } from "./wallet";
import type { TransferRequest as TransferRequestType } from "./transfers";
import {
  prepareSignedTransfer as prepareSignedTransferHelper,
  sendTransfer as sendTransferHelper,
  sendTransferBatch as sendTransferBatchHelper,
} from "./transfers";
import type {
  AutomationOptions,
  AutomationController,
  QubiQSdkOptions,
  QubiQSdk,
  EncryptSeedResult,
} from "./types";

export async function createQubiQSdk(options: QubiQSdkOptions = {}): Promise<QubiQSdk> {
  const clients = createClients(options.clientConfig);
  const walletResolution = await resolveWallet(options);
  const wallet = walletResolution?.wallet;
  const walletTools = walletResolution ? createWalletTools(walletResolution) : undefined;
  const contracts = createContractToolkit({ client: clients.live });
  const proposals = createProposalToolkit(clients.live);

  const automationOptions =
    typeof options.automation === "object" && options.automation !== null
      ? options.automation
      : undefined;
  const automation = automationOptions
    ? await setupAutomation(clients, automationOptions)
    : undefined;

  async function sendTransfer(request: TransferRequestType): Promise<BroadcastTransactionResponse> {
    if (!wallet) {
      throw new Error("A wallet seed is required to send transfers");
    }
    return sendTransferHelper(wallet, clients.live, request, walletResolution?.guardrails);
  }

  async function sendTransferBatch(
    requests: TransferRequestType[],
  ): Promise<BroadcastTransactionResponse[]> {
    if (!wallet) {
      throw new Error("A wallet seed is required to send transfers");
    }
    return sendTransferBatchHelper(wallet, clients.live, requests, walletResolution?.guardrails);
  }

  async function prepareTransfer(request: TransferRequestType): Promise<SignedTransfer> {
    if (!wallet) {
      throw new Error("A wallet seed is required to prepare transfers");
    }
    return prepareSignedTransferHelper(wallet, clients.live, request, walletResolution?.guardrails);
  }

  return {
    clients,
    wallet,
    walletTools,
    automation,
    contracts,
    proposals,
    sendTransfer,
    sendTransferBatch,
    prepareTransfer,
  };
}

async function setupAutomation(
  clients: ReturnType<typeof createClients>,
  options: AutomationOptions,
): Promise<AutomationController> {
  let eventBus: AutomationEventBus | undefined;
  if (options.eventBus === true) {
    eventBus = new ConsoleAutomationEventBus();
  } else if (options.eventBus && typeof options.eventBus === "object") {
    eventBus = options.eventBus;
  }
  const runtimeOptions = attachAutomationCallbacks(options.runtimeOptions, eventBus);
  const runtime = createAutomationRuntime(options.profile, {
    client: clients.live,
    ...runtimeOptions,
  });

  if (options.autoStart) {
    await runtime.start();
  }

  return {
    runtime,
    start: () => runtime.start(),
    stop: () => runtime.stop(),
  };
}


function attachAutomationCallbacks(
  runtimeOptions: AutomationRuntimeOptions | undefined,
  eventBus?: AutomationEventBus,
): AutomationRuntimeOptions | undefined {
  if (!eventBus) {
    return runtimeOptions;
  }
  return {
    ...runtimeOptions,
    onBalanceSnapshot: createEventWrapper(
      runtimeOptions?.onBalanceSnapshot,
      eventBus,
      (snapshots: BalanceSnapshot[]) => ({ type: "balance.snapshot", snapshots }),
    ),
    onBalanceChange: createEventWrapper(
      runtimeOptions?.onBalanceChange,
      eventBus,
      (payload: WalletWatcherEventMap["balanceChanged"] & { identity: string }) => ({
        type: "balance.change",
        payload,
      }),
    ),
    onProposals: createEventWrapper(
      runtimeOptions?.onProposals,
      eventBus,
      (result: CcfProposalFetchResult) => ({ type: "proposals.update", result }),
    ),
    onTickSample: createEventWrapper(
      runtimeOptions?.onTickSample,
      eventBus,
      (sample: TickSample) => ({ type: "tick.sample", sample }),
    ),
  };
}

function createEventWrapper<Args extends unknown[]>(
  handler: ((...args: Args) => Promise<void> | void) | undefined,
  eventBus: AutomationEventBus,
  eventFactory: (...args: Args) => AutomationEvent,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    if (handler) {
      await handler(...args);
    }
    await eventBus.publish(eventFactory(...args));
  };
}

export { ConsoleAutomationEventBus, WebhookAutomationEventBus } from "./automation";
export type { AutomationEventBus, AutomationEvent } from "./automation";

export {
  createContractToolkit,
  encodeStruct,
  decodeStruct,
} from "./contracts";
export type {
  ContractToolkit,
  ContractBinding,
  ContractFunctionBinding,
  ContractProcedureBinding,
  ContractCall,
  ContractCallResult,
} from "./contracts";
export { createProposalToolkit } from "./proposals";
export type { ProposalToolkit } from "./proposals";
export type { WalletConfig, WalletResolution, WalletTools } from "./wallet";
export {
  resolveWallet,
  createWalletTools,
  encryptWalletSeed,
  decryptWalletSeed,
  extractGuardrails,
  DEFAULT_TICK_OFFSET,
  DEFAULT_MIN_TICK_OFFSET,
  DEFAULT_MAX_TICK_OFFSET,
} from "./wallet";
export type { TransferRequest } from "./transfers";
export {
  prepareSignedTransfer,
  sendTransfer,
  sendTransferBatch,
} from "./transfers";
export { loadQubiQSdkConfig, resolveSdkConfig } from "./config";
export type { SdkConfigFile, SdkAutomationConfig, SdkEventBusConfig } from "./types";
