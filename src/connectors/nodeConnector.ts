import { LiveServiceClient } from "../clients/http/liveServiceClient";
import { QueryServiceClient } from "../clients/http/queryServiceClient";
import type {
  BroadcastTransactionRequest,
  BroadcastTransactionResponse,
  QueryServiceTickResponse,
  TickInfo,
  TickInfoResponse,
} from "../types";

type Listener<T> = (payload: T) => void;

export type ConnectorStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "error"
  | "closed";

export interface ConnectorEventMap extends Record<string, unknown> {
  status: ConnectorStatus;
  tick: TickInfo;
  error: Error;
}

export abstract class BaseConnector<
  Events extends Record<string, unknown> = ConnectorEventMap,
> {
  private readonly listeners = new Map<
    keyof Events,
    Set<Listener<Events[keyof Events]>>
  >();
  protected status: ConnectorStatus = "idle";

  getStatus(): ConnectorStatus {
    return this.status;
  }

  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    const existing = this.listeners.get(type) ?? new Set();
    existing.add(listener as Listener<Events[keyof Events]>);
    this.listeners.set(type, existing);
    return () => this.off(type, listener);
  }

  off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
    const existing = this.listeners.get(type);
    if (!existing) return;
    existing.delete(listener as Listener<Events[keyof Events]>);
    if (existing.size === 0) {
      this.listeners.delete(type);
    }
  }

  protected emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }

  protected setStatus(status: ConnectorStatus): void {
    this.status = status;
    this.emit("status" as keyof Events, status as Events[keyof Events]);
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
}

export interface HttpConnectorOptions {
  pollIntervalMs?: number;
  liveClient?: LiveServiceClient;
  queryClient?: QueryServiceClient;
}

export class HttpConnector extends BaseConnector {
  private readonly pollIntervalMs: number;
  private readonly liveClient: LiveServiceClient;
  private readonly queryClient: QueryServiceClient;
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(options: HttpConnectorOptions = {}) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.liveClient = options.liveClient ?? new LiveServiceClient();
    this.queryClient = options.queryClient ?? new QueryServiceClient();
  }

  async start(): Promise<void> {
    if (this.pollHandle) {
      return;
    }

    this.setStatus("connecting");
    try {
      await this.pollOnce();
      this.pollHandle = setInterval(() => {
        this.pollOnce().catch((error) => this.emit("error", error));
      }, this.pollIntervalMs);
      this.setStatus("ready");
    } catch (error) {
      this.setStatus("error");
      this.emit("error", error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
    }
    this.setStatus("closed");
  }

  async getTickInfo(): Promise<TickInfoResponse> {
    return this.liveClient.getTickInfo();
  }

  async getLastProcessedTick(): Promise<QueryServiceTickResponse> {
    return this.queryClient.getLastProcessedTick();
  }

  async broadcastTransaction(
    payload: BroadcastTransactionRequest,
  ): Promise<BroadcastTransactionResponse> {
    return this.liveClient.broadcastTransaction(payload);
  }

  private async pollOnce(): Promise<void> {
    const { tickInfo } = await this.liveClient.getTickInfo();
    this.emit("tick", tickInfo);
  }
}
