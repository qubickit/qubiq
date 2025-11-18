export interface TelemetryLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export class ConsoleTelemetryLogger implements TelemetryLogger {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[telemetry] ${message}`, meta ?? "");
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    console.error(`[telemetry] ${message}`, error ?? "", meta ?? "");
  }
}

export function createTelemetryLogger(logger?: TelemetryLogger): TelemetryLogger {
  return logger ?? new ConsoleTelemetryLogger();
}
