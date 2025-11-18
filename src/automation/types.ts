export interface AutomationLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export interface AutomationJobContext {
  signal: AbortSignal;
  logger: AutomationLogger;
  metadata?: Record<string, unknown>;
}

export type AutomationJob = (context: AutomationJobContext) => Promise<void>;

export interface AutomationTaskConfig {
  name: string;
  job: AutomationJob;
  intervalMs: number;
  runOnStart?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AutomationPipelineOptions {
  logger?: AutomationLogger;
}

export class ConsoleAutomationLogger implements AutomationLogger {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[automation] ${message}`, meta ?? "");
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    console.error(`[automation] ${message}`, error ?? "", meta ?? "");
  }
}

export function createAutomationLogger(logger?: AutomationLogger): AutomationLogger {
  return logger ?? new ConsoleAutomationLogger();
}
