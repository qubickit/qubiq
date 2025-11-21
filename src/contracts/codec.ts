/**
 * Shared little-endian codec helpers for Qubic contract payloads.
 * These helpers are stable library utilities (not auto-generated) and should
 * be reused by hand-written contract encoders/decoders.
 */

export interface EncodeContext {
  buffer: Uint8Array;
  view: DataView;
  offset: number;
}

export function createEncodeContext(length: number): EncodeContext {
  const buffer = new Uint8Array(length);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return { buffer, view, offset: 0 };
}

export function writeU8(ctx: EncodeContext, value: number) {
  ctx.view.setUint8(ctx.offset, value);
  ctx.offset += 1;
}

export function writeBool(ctx: EncodeContext, value: boolean) {
  writeU8(ctx, value ? 1 : 0);
}

export function writeU16(ctx: EncodeContext, value: number) {
  ctx.view.setUint16(ctx.offset, value, true);
  ctx.offset += 2;
}

export function writeU32(ctx: EncodeContext, value: number) {
  ctx.view.setUint32(ctx.offset, value, true);
  ctx.offset += 4;
}

export function writeI32(ctx: EncodeContext, value: number) {
  ctx.view.setInt32(ctx.offset, value, true);
  ctx.offset += 4;
}

export function writeU64(ctx: EncodeContext, value: bigint) {
  const normalized = toBigInt(value);
  const low = Number(normalized & 0xffffffffn);
  const high = Number((normalized >> 32n) & 0xffffffffn);
  ctx.view.setUint32(ctx.offset, low, true);
  ctx.view.setUint32(ctx.offset + 4, high, true);
  ctx.offset += 8;
}

export function writeI64(ctx: EncodeContext, value: bigint) {
  const normalized = toBigInt(value);
  const low = Number(normalized & 0xffffffffn);
  const high = Number((normalized >> 32n) & 0xffffffffn);
  ctx.view.setInt32(ctx.offset, low, true);
  ctx.view.setInt32(ctx.offset + 4, high, true);
  ctx.offset += 8;
}

export function writeBytes(ctx: EncodeContext, bytes: Uint8Array) {
  ctx.buffer.set(bytes, ctx.offset);
  ctx.offset += bytes.length;
}

export function writeId(ctx: EncodeContext, id: Uint8Array) {
  if (id.length !== 32) {
    throw new Error("id must be 32 bytes");
  }
  writeBytes(ctx, id);
}

export function readU8(view: DataView, offset: number) {
  return { value: view.getUint8(offset), next: offset + 1 };
}

export function readBool(view: DataView, offset: number) {
  const { value, next } = readU8(view, offset);
  return { value: value !== 0, next };
}

export function readU16(view: DataView, offset: number) {
  return { value: view.getUint16(offset, true), next: offset + 2 };
}

export function readU32(view: DataView, offset: number) {
  return { value: view.getUint32(offset, true), next: offset + 4 };
}

export function readI32(view: DataView, offset: number) {
  return { value: view.getInt32(offset, true), next: offset + 4 };
}

export function readU64(view: DataView, offset: number) {
  const low = BigInt(view.getUint32(offset, true));
  const high = BigInt(view.getUint32(offset + 4, true));
  return { value: (high << 32n) | low, next: offset + 8 };
}

export function readI64(view: DataView, offset: number) {
  const low = BigInt(view.getInt32(offset, true));
  const high = BigInt(view.getInt32(offset + 4, true));
  return { value: (high << 32n) | (low & 0xffffffffn), next: offset + 8 };
}

export function readBytes(buffer: Uint8Array, offset: number, length: number) {
  return { value: buffer.slice(offset, offset + length), next: offset + length };
}

export function readId(buffer: Uint8Array, offset: number) {
  return readBytes(buffer, offset, 32);
}

export function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value);
}
