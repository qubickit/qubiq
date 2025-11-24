import type { Buffer as NodeBuffer } from "node:buffer";

declare const btoa: (data: string) => string;
declare const atob: (data: string) => string;

function getBufferCtor(): typeof Buffer | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const maybeBuffer = (globalThis as typeof globalThis & { Buffer?: NodeBuffer }).Buffer;
  return typeof maybeBuffer === "function" ? maybeBuffer : undefined;
}

const BufferCtor = getBufferCtor();

function ensureBrowserBase64(method: "encode" | "decode") {
  if (typeof btoa === "function" && typeof atob === "function") {
    return;
  }
  throw new Error(`Base64 ${method} is not supported in this environment`);
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (BufferCtor) {
    return BufferCtor.from(bytes).toString("base64");
  }
  ensureBrowserBase64("encode");
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  if (BufferCtor) {
    return new Uint8Array(BufferCtor.from(value, "base64"));
  }
  ensureBrowserBase64("decode");
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
