import { EventEmitter } from "node:events";
import type { QubicNodeClient } from "@node/qubicNodeClient";
import { bytesToBase64 } from "@src/utils/base64";
import type {
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  TickInfoResponse,
} from "@types";
import type { Wallet } from "@wallet/wallet";

export interface TransactionQueueItem {
  destinationPublicKey: string;
  amount: bigint;
  tickOffset?: number;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
}

export interface TransactionQueueOptions {
  wallet: Wallet;
  client: Pick<QubicNodeClient, "getTickInfo" | "broadcastTransaction">;
  defaultTickOffset?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
}

export interface TransactionQueueProcessedEvent {
  item: TransactionQueueItem;
  response: BroadcastTransactionResponse;
}

export interface TransactionQueueErrorEvent {
  item: TransactionQueueItem;
  error: unknown;
}

export interface TransactionQueueDispatchEvent {
  item: TransactionQueueItem;
  attempt: number;
  scheduledTick: number;
}

export interface TransactionQueueRetryEvent {
  item: TransactionQueueItem;
  attempt: number;
  maxAttempts: number;
  error: unknown;
}

interface QueueEntry {
  item: TransactionQueueItem;
  attempts: number;
}

export class TransactionQueue extends EventEmitter {
  private readonly wallet: Wallet;
  private readonly client: Pick<QubicNodeClient, "getTickInfo" | "broadcastTransaction">;
  private readonly defaultTickOffset: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly queue: QueueEntry[] = [];
  private readonly pendingRetryTimers = new Set<ReturnType<typeof setTimeout>>();
  private processing = false;
  private stopped = false;
  private idleResolvers: Array<() => void> = [];

  constructor(options: TransactionQueueOptions) {
    super();
    this.wallet = options.wallet;
    this.client = options.client;
    this.defaultTickOffset = options.defaultTickOffset ?? 10;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.retryDelayMs = Math.max(10, options.retryDelayMs ?? 2_000);
  }

  enqueue(item: TransactionQueueItem) {
    if (this.stopped) {
      throw new Error("transaction queue has been stopped");
    }
    this.enqueueEntry({
      item,
      attempts: 0,
    });
    void this.processQueue();
  }

  clear() {
    this.queue.length = 0;
    this.cancelPendingRetries();
  }

  async stop() {
    this.stopped = true;
    this.clear();
    await this.waitForIdle();
  }

  async waitForIdle(): Promise<void> {
    if (!this.processing && this.queue.length === 0 && this.pendingRetryTimers.size === 0) {
      return;
    }
    return new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private async processQueue() {
    if (this.processing || this.stopped) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0 && !this.stopped) {
      const entry = this.queue.shift();
      if (!entry) break;

      try {
        const response = await this.processEntry(entry);
        this.emit("processed", { item: entry.item, response });
      } catch (error) {
        entry.attempts += 1;
        if (this.shouldRetry(entry)) {
          this.scheduleRetry(entry, error);
        } else {
          this.emit("error", { item: entry.item, error });
        }
      }
    }

    this.processing = false;
    this.resolveIdleIfNeeded();
  }

  private async processEntry(entry: QueueEntry): Promise<BroadcastTransactionResponse> {
    const tickInfo = await this.client.getTickInfo();
    const attempt = entry.attempts + 1;
    const nextTick = this.getScheduledTick(tickInfo, entry.item.tickOffset);
    this.emit("dispatch", {
      item: entry.item,
      attempt,
      scheduledTick: nextTick,
    });

    const signed = await this.wallet.signTransfer({
      destinationPublicKey: entry.item.destinationPublicKey,
      amount: entry.item.amount,
      tick: nextTick,
    });
    const encodedTransaction = bytesToBase64(signed.bytes);
    const payload: BroadcastTransactionRequest = {
      encodedTransaction,
      metadata: entry.item.metadata,
    };
    return this.client.broadcastTransaction(payload);
  }

  private shouldRetry(entry: QueueEntry): boolean {
    const maxAttempts = entry.item.maxAttempts ?? this.maxAttempts;
    return entry.attempts < maxAttempts && !this.stopped;
  }

  private scheduleRetry(entry: QueueEntry, error: unknown) {
    const maxAttempts = entry.item.maxAttempts ?? this.maxAttempts;
    this.emit("retry", {
      item: entry.item,
      attempt: entry.attempts,
      maxAttempts,
      error,
    });
    const timer = setTimeout(() => {
      this.pendingRetryTimers.delete(timer);
      if (this.stopped) {
        return;
      }
      this.enqueueEntry(entry, true);
      void this.processQueue();
    }, this.retryDelayMs);
    this.pendingRetryTimers.add(timer);
  }

  private enqueueEntry(entry: QueueEntry, front = false) {
    if (front) {
      this.queue.unshift(entry);
    } else {
      this.queue.push(entry);
    }
  }

  private getScheduledTick(tickInfo: TickInfoResponse, offset?: number): number {
    const tick = tickInfo.tickInfo.tick;
    const delta = offset ?? this.defaultTickOffset;
    return tick + delta;
  }

  addProcessedListener(listener: (event: TransactionQueueProcessedEvent) => void): this {
    return this.on("processed", listener);
  }

  addErrorListener(listener: (event: TransactionQueueErrorEvent) => void): this {
    return this.on("error", listener);
  }

  addDispatchListener(listener: (event: TransactionQueueDispatchEvent) => void): this {
    return this.on("dispatch", listener);
  }

  addRetryListener(listener: (event: TransactionQueueRetryEvent) => void): this {
    return this.on("retry", listener);
  }

  private cancelPendingRetries() {
    for (const timer of this.pendingRetryTimers) {
      clearTimeout(timer);
    }
    this.pendingRetryTimers.clear();
    this.resolveIdleIfNeeded();
  }

  private resolveIdleIfNeeded() {
    if (this.processing || this.queue.length > 0 || this.pendingRetryTimers.size > 0) {
      return;
    }
    const resolvers = this.idleResolvers;
    this.idleResolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
}
