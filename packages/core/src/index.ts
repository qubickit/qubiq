import { ArchiveClient } from "@clients/http/archiveClient";
import { LiveServiceClient } from "@clients/http/liveServiceClient";
import { QueryServiceClient } from "@clients/http/queryServiceClient";
import type { HttpConnectorOptions } from "@connectors/nodeConnector";
import { HttpConnector } from "@connectors/nodeConnector";
import type { ClientConfig } from "@src/config";

export * from "./automation";
export * from "./boot";
export * from "./clients";
export * from "./config";
export * from "./connectors";
export * from "./interop";
export * from "./monitoring";
export * from "./node";
export * from "./proposals";
export * from "./serialization";
export * from "./testing";
export * from "./types";
export * from "./wallet";

export interface CreateConnectorOptions
  extends ClientConfig,
    Omit<HttpConnectorOptions, "liveClient" | "queryClient"> {}

export function createHttpConnector(options: CreateConnectorOptions = {}): HttpConnector {
  const liveClient = new LiveServiceClient({
    baseUrl: options.liveBaseUrl,
  });
  const queryClient = new QueryServiceClient({
    baseUrl: options.queryServiceBaseUrl ?? options.liveBaseUrl,
  });

  return new HttpConnector({
    pollIntervalMs: options.pollIntervalMs,
    liveClient,
    queryClient,
  });
}

export function createClients(config: ClientConfig = {}) {
  return {
    live: new LiveServiceClient({ baseUrl: config.liveBaseUrl }),
    archive: new ArchiveClient({ baseUrl: config.archiveBaseUrl }),
    query: new QueryServiceClient({
      baseUrl: config.queryServiceBaseUrl ?? config.liveBaseUrl,
    }),
  };
}
