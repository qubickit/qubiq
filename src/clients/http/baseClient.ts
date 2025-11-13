import { DEFAULT_REQUEST_TIMEOUT_MS } from "@src/config";
import type { ZodType } from "zod";

export interface HttpClientOptions {
  baseUrl?: string;
  headers?: HeadersInit;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly response: Response,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export abstract class HttpClient {
  protected readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor({ baseUrl, headers, fetchImpl, timeoutMs }: HttpClientOptions = {}) {
    this.baseUrl = baseUrl ?? "";
    this.defaultHeaders = headers ?? {};
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  protected async get<T>(path: string, schema?: ZodType<T>, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...(init ?? {}), method: "GET" }, schema);
  }

  protected async post<T>(
    path: string,
    body?: unknown,
    schema?: ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    const headers: HeadersInit = {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    };
    return this.request<T>(
      path,
      {
        ...(init ?? {}),
        method: "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      schema,
    );
  }

  private toUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalized = path.startsWith("/") || this.baseUrl.endsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  protected async request<T>(path: string, init: RequestInit, schema?: ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.toUrl(path), {
        ...init,
        headers: {
          ...this.defaultHeaders,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        throw new HttpError(
          `Request to ${path} failed with status ${response.status}`,
          response,
          errorBody,
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      return schema ? schema.parse(data) : (data as T);
    } finally {
      clearTimeout(timeout);
    }
  }
}
