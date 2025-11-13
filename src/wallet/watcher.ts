import { LiveServiceClient } from "@clients/http/liveServiceClient";
import type { BalanceRecord, BalanceResponse } from "@types";

type Listener<T> = (payload: T) => void;

export interface WalletWatcherEventMap {
  balanceChanged: { previous?: BalanceRecord; current: BalanceRecord };
  error: Error;
}

export interface WalletWatcherOptions {
  identity: string;
  pollIntervalMs?: number;
  client?: LiveServiceClient;
}

export class WalletWatcher {
  private readonly identity: string;
  private readonly pollIntervalMs: number;
  private readonly client: LiveServiceClient;
  private timer?: ReturnType<typeof setInterval>;
  private lastBalance?: BalanceRecord;
  private readonly listeners = new Map<
    keyof WalletWatcherEventMap,
    Set<Listener<WalletWatcherEventMap[keyof WalletWatcherEventMap]>>
  >();

  constructor(options: WalletWatcherOptions) {
    this.identity = options.identity;
    this.pollIntervalMs = options.pollIntervalMs ?? 5_000;
    this.client = options.client ?? new LiveServiceClient();
  }

  on<K extends keyof WalletWatcherEventMap>(
    type: K,
    listener: Listener<WalletWatcherEventMap[K]>,
  ): () => void {
    const handlers = this.listeners.get(type) ?? new Set();
    handlers.add(listener as Listener<WalletWatcherEventMap[keyof WalletWatcherEventMap]>);
    this.listeners.set(type, handlers);
    return () => this.off(type, listener);
  }

  off<K extends keyof WalletWatcherEventMap>(
    type: K,
    listener: Listener<WalletWatcherEventMap[K]>,
  ) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    handlers.delete(listener as Listener<WalletWatcherEventMap[keyof WalletWatcherEventMap]>);
    if (handlers.size === 0) {
      this.listeners.delete(type);
    }
  }

  async start(): Promise<void> {
    if (this.timer) return;
    await this.pollOnce();
    this.timer = setInterval(() => {
      this.pollOnce().catch((error) => this.emit("error", error));
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async pollOnce(): Promise<void> {
    const response: BalanceResponse = await this.client.getBalance(this.identity);
    const current = response.balance;
    if (!this.lastBalance || hasBalanceChanged(this.lastBalance, current)) {
      this.emit("balanceChanged", {
        previous: this.lastBalance,
        current,
      });
      this.lastBalance = current;
    }
  }

  private emit<K extends keyof WalletWatcherEventMap>(type: K, payload: WalletWatcherEventMap[K]) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    handlers.forEach((handler) => {
      handler(payload);
    });
  }
}

function hasBalanceChanged(a: BalanceRecord, b: BalanceRecord): boolean {
  return (
    a.balance !== b.balance ||
    a.incomingAmount !== b.incomingAmount ||
    a.outgoingAmount !== b.outgoingAmount ||
    a.latestIncomingTransferTick !== b.latestIncomingTransferTick ||
    a.latestOutgoingTransferTick !== b.latestOutgoingTransferTick
  );
}
