import type { RequestResponseHeader } from "@types";
import { RequestResponseHeaderSchema } from "@types";

const HEADER_SIZE = 8; // 3 bytes size + 1 type + 4 dejavu

export function encodeRequestResponseHeader(header: RequestResponseHeader): Uint8Array {
  const parsed = RequestResponseHeaderSchema.parse(header);
  const buffer = new ArrayBuffer(HEADER_SIZE);
  const view = new DataView(buffer);

  if (parsed.size > 0xffffff) {
    throw new Error("Header size exceeds 24-bit limit");
  }

  view.setUint8(0, parsed.size & 0xff);
  view.setUint8(1, (parsed.size >> 8) & 0xff);
  view.setUint8(2, (parsed.size >> 16) & 0xff);
  view.setUint8(3, parsed.type);
  view.setUint32(4, parsed.dejavu, true);

  return new Uint8Array(buffer);
}

export function decodeRequestResponseHeader(bytes: Uint8Array): RequestResponseHeader {
  if (bytes.length < HEADER_SIZE) {
    throw new Error("Header buffer too small");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint8(0) | (view.getUint8(1) << 8) | (view.getUint8(2) << 16);
  const type = view.getUint8(3);
  const dejavu = view.getUint32(4, true);
  return RequestResponseHeaderSchema.parse({ size, type, dejavu });
}

export { HEADER_SIZE as REQUEST_RESPONSE_HEADER_SIZE };
