import type {
  BalanceResponse,
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  QuerySmartContractRequest,
  QuerySmartContractResponse,
  TickInfoResponse,
} from "@types";

export interface MockLiveServiceOptions {
  tickInfo?: TickInfoResponse;
  balances?: Record<string, BalanceResponse>;
  broadcastResponses?: Array<BroadcastTransactionResponse>;
  contractResponses?: Record<string, QuerySmartContractResponse>;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class MockLiveServiceClient {
  private tickInfo: TickInfoResponse;
  private readonly balances = new Map<string, BalanceResponse>();
  private readonly contractResponses = new Map<string, QuerySmartContractResponse>();
  private readonly broadcasts: BroadcastTransactionRequest[] = [];
  private readonly broadcastResponses: BroadcastTransactionResponse[];

  constructor(options: MockLiveServiceOptions = {}) {
    this.tickInfo =
      options.tickInfo ??
      ({
        tickInfo: { tick: 0, duration: 1000, epoch: 0, initialTick: 0 },
      } satisfies TickInfoResponse);
    const balances = options.balances ?? {};
    for (const [identity, response] of Object.entries(balances)) {
      this.balances.set(identity, deepClone(response));
    }
    const contractResponses = options.contractResponses ?? {};
    for (const [key, response] of Object.entries(contractResponses)) {
      this.contractResponses.set(key, deepClone(response));
    }
    this.broadcastResponses = options.broadcastResponses ?? [
      { transactionId: crypto.randomUUID() } satisfies BroadcastTransactionResponse,
    ];
  }

  setTickInfo(response: TickInfoResponse) {
    this.tickInfo = deepClone(response);
  }

  setBalance(identity: string, response: BalanceResponse) {
    this.balances.set(identity, deepClone(response));
  }

  setContractResponse(key: string, response: QuerySmartContractResponse) {
    this.contractResponses.set(key, deepClone(response));
  }

  async getTickInfo(): Promise<TickInfoResponse> {
    return deepClone(this.tickInfo);
  }

  async getBalance(identity: string): Promise<BalanceResponse> {
    const response = this.balances.get(identity);
    if (!response) {
      throw new Error(`No balance fixture for ${identity}`);
    }
    return deepClone(response);
  }

  async broadcastTransaction(
    payload: BroadcastTransactionRequest,
  ): Promise<BroadcastTransactionResponse> {
    this.broadcasts.push(payload);
    const response = this.broadcastResponses[this.broadcasts.length - 1] ?? {
      transactionId: crypto.randomUUID(),
    };
    return deepClone(response);
  }

  async querySmartContract(
    payload: QuerySmartContractRequest,
  ): Promise<QuerySmartContractResponse> {
    const key = `${payload.contractIndex}:${payload.inputType}`;
    const response = this.contractResponses.get(key);
    if (!response) {
      throw new Error(`No contract response for ${key}`);
    }
    return deepClone(response);
  }

  getBroadcastLog(): BroadcastTransactionRequest[] {
    return this.broadcasts.map((payload) => deepClone(payload));
  }
}
