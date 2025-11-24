import http from "node:http";

import type { TelemetryMetricsRegistry } from "./metricsRegistry";
import type { TelemetryLogger } from "./types";
import { createTelemetryLogger } from "./types";

export interface PrometheusServerOptions {
  registry: TelemetryMetricsRegistry;
  port?: number;
  host?: string;
  logger?: TelemetryLogger;
}

export class PrometheusMetricsServer {
  private readonly registry: TelemetryMetricsRegistry;
  private readonly logger: TelemetryLogger;
  private readonly requestedPort: number;
  private readonly host: string;
  private server: http.Server | null = null;
  private resolvedPort?: number;

  constructor(options: PrometheusServerOptions) {
    this.registry = options.registry;
    this.logger = createTelemetryLogger(options.logger);
    this.requestedPort = options.port ?? 9300;
    this.host = options.host ?? "0.0.0.0";
  }

  async start() {
    if (this.server) return;
    this.server = http.createServer((req, res) => {
      if (req.method === "GET" && req.url?.startsWith("/metrics")) {
        const body = this.registry.toPrometheus();
        res.setHeader("Content-Type", "text/plain; version=0.0.4");
        res.writeHead(200);
        res.end(body);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.listen(this.requestedPort, this.host, () => {
        const address = this.server?.address();
        if (typeof address === "object" && address && !Array.isArray(address)) {
          this.resolvedPort = address.port;
        } else if (typeof address === "number") {
          this.resolvedPort = address;
        } else {
          this.resolvedPort = this.requestedPort;
        }
        this.logger.info(
          `Prometheus metrics server listening on http://${this.host}:${this.getPort()}/metrics`,
        );
        resolve();
      });
      this.server?.on("error", reject);
    });
  }

  async stop() {
    const current = this.server;
    if (!current) return;
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      current.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  getPort(): number {
    return this.resolvedPort ?? this.requestedPort;
  }
}
