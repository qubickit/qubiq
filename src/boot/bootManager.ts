import { FileBootStateStore } from "@boot/fileStore";
import type { BootDecision, BootDecisionContext, BootStateStore } from "@boot/types";
import { BootMode } from "@boot/types";
import { LiveServiceClient } from "@clients/http/liveServiceClient";
import { QueryServiceClient } from "@clients/http/queryServiceClient";
import { DEFAULT_LIVE_BASE_URL, DEFAULT_QUERY_SERVICE_BASE_URL } from "@src/config";

const DEFAULT_STATE_PATH = ".qubic/boot-state.json";

export interface BootManagerOptions {
  stateStore?: BootStateStore;
  persistPath?: string;
  liveBaseUrl?: string;
  queryServiceBaseUrl?: string;
  liveClient?: LiveServiceClient;
  queryClient?: QueryServiceClient;
}

export class BootManager {
  private readonly store: BootStateStore;
  private readonly liveClient: LiveServiceClient;
  private readonly queryClient: QueryServiceClient;

  constructor(options: BootManagerOptions = {}) {
    this.store =
      options.stateStore ?? new FileBootStateStore(options.persistPath ?? DEFAULT_STATE_PATH);
    this.liveClient =
      options.liveClient ??
      new LiveServiceClient({ baseUrl: options.liveBaseUrl ?? DEFAULT_LIVE_BASE_URL });
    this.queryClient =
      options.queryClient ??
      new QueryServiceClient({
        baseUrl:
          options.queryServiceBaseUrl ?? options.liveBaseUrl ?? DEFAULT_QUERY_SERVICE_BASE_URL,
      });
  }

  async decide(context: BootDecisionContext = {}): Promise<BootDecision> {
    if (context.forcedMode !== undefined) {
      return this.persistDecision({
        mode: context.forcedMode,
        reason: "Boot mode forced by user",
        flag: context.forcedMode === BootMode.Scratch ? 1 : 0,
        epoch: context.desiredEpoch ?? (await this.fetchRemoteEpoch()),
      });
    }

    const remoteEpoch = context.desiredEpoch ?? (await this.fetchRemoteEpoch());
    const lastState = await this.store.load();

    if (!lastState) {
      return this.persistDecision({
        mode: BootMode.Scratch,
        reason: "No stored boot state; defaulting to clean start",
        flag: 1,
        epoch: remoteEpoch,
      });
    }

    if (context.requireCleanState) {
      return this.persistDecision({
        mode: BootMode.Scratch,
        reason: "Clean state requested",
        flag: 1,
        epoch: remoteEpoch,
      });
    }

    if (remoteEpoch > lastState.epoch + 1) {
      return this.persistDecision({
        mode: BootMode.Scratch,
        reason: `Detected remote epoch ${remoteEpoch} beyond stored epoch ${lastState.epoch}`,
        flag: 1,
        epoch: remoteEpoch,
      });
    }

    return this.persistDecision({
      mode: BootMode.Seamless,
      reason: "Epoch continuity intact",
      flag: 0,
      epoch: remoteEpoch,
    });
  }

  private async fetchRemoteEpoch(): Promise<number> {
    try {
      const [tickInfo, lastProcessed] = await Promise.all([
        this.liveClient.getTickInfo().catch(() => undefined),
        this.queryClient.getLastProcessedTick().catch(() => undefined),
      ]);
      return Math.max(tickInfo?.tickInfo.epoch ?? 0, lastProcessed?.epoch ?? 0);
    } catch {
      return 0;
    }
  }

  private async persistDecision(decision: BootDecision): Promise<BootDecision> {
    await this.store.save({ epoch: decision.epoch, mode: decision.mode, timestamp: Date.now() });
    return decision;
  }
}
