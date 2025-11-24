import { readFile } from "node:fs/promises";
import type { QubiQSdkOptions, SdkAutomationConfig, SdkConfigFile, SdkEventBusConfig } from "./types";
import { ConsoleAutomationEventBus, WebhookAutomationEventBus } from "./automation";
import type { AutomationOptions } from "./types";

const ENV_TOKEN = /\$\{ENV:([^}]+)\}/i;

type EnvMap = Record<string, string | undefined>;

export interface LoadSdkConfigOptions {
  env?: EnvMap;
  overrides?: Partial<SdkConfigFile>;
}

export async function loadQubiQSdkConfig(
  filePath: string,
  options: LoadSdkConfigOptions = {},
): Promise<QubiQSdkOptions> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SdkConfigFile;
  const merged = mergeConfig(parsed, options.overrides);
  return resolveSdkConfig(merged, options.env ?? process.env);
}

export function resolveSdkConfig(config: SdkConfigFile, env: EnvMap = process.env): QubiQSdkOptions {
  const wallet = config.wallet ? (applyEnv(config.wallet, env) as typeof config.wallet) : undefined;
  const client = config.client ? (applyEnv(config.client, env) as typeof config.client) : undefined;
  const automation = resolveAutomationConfig(config.automation, env);

  return {
    walletConfig: wallet,
    clientConfig: client,
    automation,
  };
}

function resolveAutomationConfig(
  automation: SdkAutomationConfig | false | undefined,
  env: EnvMap,
): AutomationOptions | false | undefined {
  if (automation === false || automation === undefined) {
    return automation;
  }
  const runtimeOptions = automation.runtimeOptions
    ? (applyEnv(automation.runtimeOptions, env) as SdkAutomationConfig["runtimeOptions"])
    : undefined;
  const eventBus = resolveEventBus(automation.eventBus, env);
  return {
    profile: automation.profile,
    runtimeOptions,
    autoStart: automation.autoStart,
    eventBus,
  } satisfies AutomationOptions;
}

function resolveEventBus(config: SdkEventBusConfig | boolean | undefined, env: EnvMap) {
  if (!config) {
    return config;
  }
  if (config === true) {
    return true;
  }
  if (config.type === "console") {
    return new ConsoleAutomationEventBus();
  }
  if (config.type === "webhook") {
    const endpoint = applyEnv(config.endpoint, env);
    const headers = config.headers ? (applyEnv(config.headers, env) as Record<string, string>) : undefined;
    return new WebhookAutomationEventBus({ endpoint: endpoint as string, headers });
  }
  return undefined;
}

function applyEnv<T>(value: T, env: EnvMap): T {
  if (typeof value === "string") {
    return substituteEnv(value, env) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyEnv(item, env)) as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = applyEnv(val, env);
    }
    return result as T;
  }
  return value;
}

function substituteEnv(value: string, env: EnvMap): string {
  const match = value.match(ENV_TOKEN);
  if (!match) {
    return value;
  }
  const varName = match[1]?.trim();
  const envValue = varName ? env[varName] : undefined;
  if (envValue === undefined) {
    throw new Error(`Environment variable ${varName ?? value} is not defined`);
  }
  return envValue;
}

function mergeConfig(base: SdkConfigFile, overrides: Partial<SdkConfigFile> | undefined): SdkConfigFile {
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...overrides,
    wallet: mergeObjects(base.wallet, overrides.wallet),
    client: mergeObjects(base.client, overrides.client),
    automation: overrides.automation ?? base.automation,
  };
}

function mergeObjects<T>(base?: T, override?: T): T | undefined {
  if (!base) return override;
  if (!override) return base;
  return { ...base, ...override };
}
