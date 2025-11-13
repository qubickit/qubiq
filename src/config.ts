export const DEFAULT_LIVE_BASE_URL = "https://api.qubic.org";
export const DEFAULT_ARCHIVE_BASE_URL =
  "https://archive.qubic.org/v2" /* placeholder, override as needed */;
export const DEFAULT_QUERY_SERVICE_BASE_URL = "https://api.qubic.org" /* same host by default */;
export const DEFAULT_STATS_BASE_URL = "https://stats.qubic.org";

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export interface ClientConfig {
  liveBaseUrl?: string;
  archiveBaseUrl?: string;
  queryServiceBaseUrl?: string;
  statsBaseUrl?: string;
}
