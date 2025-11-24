import { performance } from "node:perf_hooks";

import type { TelemetryMetricsRegistry } from "./metricsRegistry";
import type { TelemetryLogger } from "./types";
import { createTelemetryLogger } from "./types";

export interface InstrumentedRequestOptions {
  name: string;
  registry?: TelemetryMetricsRegistry;
  logger?: TelemetryLogger;
}

export async function instrumentRequest<T>(
  fn: () => Promise<T> | T,
  options: InstrumentedRequestOptions,
): Promise<T> {
  const start = performance.now();
  const logger = createTelemetryLogger(options.logger);
  try {
    const result = await fn();
    options.registry?.recordRequest(options.name, performance.now() - start, true);
    return result;
  } catch (error) {
    options.registry?.recordRequest(
      options.name,
      performance.now() - start,
      false,
      error instanceof Error ? error.message : String(error),
    );
    logger.error(`instrumented request "${options.name}" failed`, error);
    throw error;
  }
}
