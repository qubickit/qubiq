import type {
  BroadcastTransactionResponse,
  LiveServiceClient,
  SignedTransfer,
  Wallet,
} from "@qubiq/core";
import { bytesToBase64 } from "@src/utils/base64";
import { normalizePublicKeyHex } from "@qubiq/core";

import type { GuardrailConfig } from "./wallet";
import { DEFAULT_MAX_TICK_OFFSET, DEFAULT_MIN_TICK_OFFSET, DEFAULT_TICK_OFFSET } from "./wallet";

export interface TransferRequest {
  destination: string;
  amount: bigint | number | string;
  tick?: number;
  tickOffset?: number;
  inputType?: number;
  payload?: Uint8Array | string;
}

export async function prepareSignedTransfer(
  wallet: Wallet,
  liveClient: LiveServiceClient,
  request: TransferRequest,
  guardrails?: GuardrailConfig,
): Promise<SignedTransfer> {
  const amount = toBigInt(request.amount);
  if (amount <= 0n) {
    throw new Error("amount must be greater than zero");
  }
  const tick = await resolveTick(liveClient, request.tick, request.tickOffset, guardrails);
  return wallet.signTransfer({
    destinationPublicKey: normalizePublicKeyHex(request.destination),
    amount,
    tick,
    inputType: request.inputType,
    inputData: toPayload(request.payload),
  });
}

export async function sendTransfer(
  wallet: Wallet,
  liveClient: LiveServiceClient,
  request: TransferRequest,
  guardrails?: GuardrailConfig,
): Promise<BroadcastTransactionResponse> {
  const signed = await prepareSignedTransfer(wallet, liveClient, request, guardrails);
  return liveClient.broadcastTransaction({
    encodedTransaction: bytesToBase64(signed.bytes),
  });
}

export async function sendTransferBatch(
  wallet: Wallet,
  liveClient: LiveServiceClient,
  requests: TransferRequest[],
  guardrails?: GuardrailConfig,
): Promise<BroadcastTransactionResponse[]> {
  const responses: BroadcastTransactionResponse[] = [];
  for (const request of requests) {
    const response = await sendTransfer(wallet, liveClient, request, guardrails);
    responses.push(response);
  }
  return responses;
}

async function resolveTick(
  liveClient: LiveServiceClient,
  tick?: number,
  tickOffset?: number,
  guardrails?: GuardrailConfig,
): Promise<number> {
  if (typeof tick === "number") {
    return tick;
  }
  const latest = await liveClient.getTickInfo();
  const minOffset = guardrails?.minTickOffset ?? DEFAULT_MIN_TICK_OFFSET;
  const maxOffset = guardrails?.maxTickOffset ?? DEFAULT_MAX_TICK_OFFSET;
  const defaultOffset = clamp(DEFAULT_TICK_OFFSET, minOffset, maxOffset);
  const offset = tickOffset ?? defaultOffset;
  if (offset < minOffset || offset > maxOffset) {
    throw new Error(`tickOffset must be between ${minOffset} and ${maxOffset}`);
  }
  return (latest.tickInfo.tick ?? 0) + offset;
}

function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") return BigInt(value);
  throw new Error("Unsupported amount value");
}

function toPayload(payload?: Uint8Array | string): Uint8Array {
  if (!payload) return new Uint8Array();
  if (payload instanceof Uint8Array) {
    return payload;
  }
  return new TextEncoder().encode(payload);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
