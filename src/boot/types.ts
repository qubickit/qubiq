export enum BootMode {
  Seamless = 0,
  Scratch = 1,
}

export interface BootState {
  epoch: number;
  mode: BootMode;
  timestamp: number;
}

export interface BootDecision {
  mode: BootMode;
  reason: string;
  flag: 0 | 1;
  epoch: number;
}

export interface BootDecisionContext {
  desiredEpoch?: number;
  requireCleanState?: boolean;
  forcedMode?: BootMode;
}

export interface BootStateStore {
  load(): Promise<BootState | undefined>;
  save(state: BootState): Promise<void>;
}
