import type { StructName } from "@src/contracts/generated/contracts.generated";
import { STRUCT_LAYOUTS } from "@src/contracts/generated/contracts.generated";
import { normalizePublicKeyHex } from "@qubiq/core";
import { hexToBytes, bytesToHex } from "@src/utils/bytes";

export type StructWireType = string;

export interface StructLayoutField {
  name: string;
  wireType: StructWireType;
  structName?: string;
  length?: number;
  elementType?: StructWireType;
  elementStructName?: string;
}

export function encodeStruct(structName: StructName, value: Record<string, unknown>): Uint8Array {
  const layout = getStructLayout(structName);
  return encodeLayout(layout, value);
}

export function decodeStruct(structName: StructName, bytes: Uint8Array): Record<string, unknown> {
  const layout = getStructLayout(structName);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const { value } = decodeLayout(layout, bytes, 0, view);
  return value;
}

export function encodeStructPayload(
  contractName: string,
  operationName: string,
  structName: StructName | undefined,
  value?: Record<string, unknown>,
) {
  if (!structName) {
    if (value !== undefined && value !== null) {
      throw new Error(`${contractName}.${operationName} does not accept input data`);
    }
    return new Uint8Array(0);
  }

  if (value === undefined || value === null) {
    throw new Error(`Missing payload for ${contractName}.${operationName}`);
  }

  return encodeStruct(structName, value);
}

export function toStructName(name?: string | null): StructName | undefined {
  if (!name) {
    return undefined;
  }
  if (!(name in STRUCT_LAYOUTS)) {
    throw new Error(`Unknown struct reference "${name}"`);
  }
  return name as StructName;
}

function getStructLayout(structName: StructName) {
  const layout = STRUCT_LAYOUTS[structName as keyof typeof STRUCT_LAYOUTS];
  if (!layout) {
    throw new Error(`Unknown struct layout for ${structName}`);
  }
  return layout as readonly StructLayoutField[];
}

function encodeLayout(layout: readonly StructLayoutField[], value: Record<string, unknown>) {
  const chunks: Uint8Array[] = [];
  for (const field of layout) {
    const fieldValue = value[field.name];
    if (fieldValue === undefined || fieldValue === null) {
      throw new Error(`Missing field ${field.name}`);
    }
    switch (field.wireType) {
      case "uint8":
      case "sint8": {
        chunks.push(Uint8Array.of(Number(fieldValue) & 0xff));
        break;
      }
      case "uint16":
      case "sint16": {
        const buffer = new ArrayBuffer(2);
        new DataView(buffer).setUint16(0, Number(fieldValue), true);
        chunks.push(new Uint8Array(buffer));
        break;
      }
      case "uint32":
      case "sint32": {
        const buffer = new ArrayBuffer(4);
        new DataView(buffer).setUint32(0, Number(fieldValue), true);
        chunks.push(new Uint8Array(buffer));
        break;
      }
      case "uint64":
      case "sint64": {
        const buffer = new ArrayBuffer(8);
        new DataView(buffer).setBigUint64(0, BigInt(fieldValue as string | number | bigint), true);
        chunks.push(new Uint8Array(buffer));
        break;
      }
      case "string": {
        const hex = normalizePublicKeyHex(String(fieldValue));
        chunks.push(hexToBytes(hex));
        break;
      }
      case "array": {
        const items = fieldValue as unknown[];
        if (!field.length) {
          throw new Error(`Array field ${field.name} does not declare a length`);
        }
        if (items.length > field.length) {
          throw new Error(`Array field ${field.name} exceeds capacity`);
        }
        for (const item of items) {
          if (field.elementStructName) {
            chunks.push(encodeStruct(field.elementStructName as StructName, item as Record<string, unknown>));
          } else if (field.elementType) {
            chunks.push(encodeArrayPrimitive(field.elementType, item));
          } else {
            throw new Error(`Unsupported array element type for ${field.name}`);
          }
        }
        const padding = field.length - items.length;
        if (padding > 0 && field.elementType) {
          chunks.push(new Uint8Array(padding * getPrimitiveSize(field.elementType)));
        }
        break;
      }
      case "struct": {
        if (!field.structName) {
          throw new Error(`Missing structName for ${field.name}`);
        }
        chunks.push(encodeStruct(field.structName as StructName, fieldValue as Record<string, unknown>));
        break;
      }
      default:
        throw new Error(`Unsupported wire type ${field.wireType} for ${field.name}`);
    }
  }
  return concatBytes(chunks);
}

function encodeArrayPrimitive(type: StructWireType, value: unknown): Uint8Array {
  switch (type) {
    case "uint8":
    case "sint8":
      return Uint8Array.of(Number(value) & 0xff);
    case "uint16":
    case "sint16": {
      const buffer = new ArrayBuffer(2);
      new DataView(buffer).setUint16(0, Number(value), true);
      return new Uint8Array(buffer);
    }
    case "uint32":
    case "sint32": {
      const buffer = new ArrayBuffer(4);
      new DataView(buffer).setUint32(0, Number(value), true);
      return new Uint8Array(buffer);
    }
    case "uint64":
    case "sint64": {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setBigUint64(0, BigInt(value as string | number | bigint), true);
      return new Uint8Array(buffer);
    }
    default:
      throw new Error(`Unsupported array element type ${type}`);
  }
}

function decodeLayout(
  layout: readonly StructLayoutField[],
  bytes: Uint8Array,
  offset: number,
  view: DataView,
): { value: Record<string, unknown>; offset: number } {
  const result: Record<string, unknown> = {};
  let cursor = offset;

  for (const field of layout) {
    switch (field.wireType) {
      case "uint8":
        result[field.name] = view.getUint8(cursor);
        cursor += 1;
        break;
      case "sint8":
        result[field.name] = view.getInt8(cursor);
        cursor += 1;
        break;
      case "uint16":
        result[field.name] = view.getUint16(cursor, true);
        cursor += 2;
        break;
      case "sint16":
        result[field.name] = view.getInt16(cursor, true);
        cursor += 2;
        break;
      case "uint32":
        result[field.name] = view.getUint32(cursor, true);
        cursor += 4;
        break;
      case "sint32":
        result[field.name] = view.getInt32(cursor, true);
        cursor += 4;
        break;
      case "uint64":
        result[field.name] = view.getBigUint64(cursor, true);
        cursor += 8;
        break;
      case "sint64":
        result[field.name] = view.getBigInt64(cursor, true);
        cursor += 8;
        break;
      case "string": {
        const length = 32;
        const slice = bytes.slice(cursor, cursor + length);
        cursor += length;
        result[field.name] = bytesToHex(slice);
        break;
      }
      case "array": {
        if (!field.length) {
          throw new Error(`Array field ${field.name} does not declare a length`);
        }
        const values: unknown[] = [];
        for (let i = 0; i < field.length; i++) {
          if (field.elementStructName) {
            const nested = decodeLayout(
              getStructLayout(field.elementStructName as StructName),
              bytes,
              cursor,
              view,
            );
            values.push(nested.value);
            cursor = nested.offset;
          } else if (field.elementType) {
            const { value, size } = decodePrimitive(field.elementType, cursor, view);
            values.push(value);
            cursor += size;
          } else {
            throw new Error(`Unsupported array element type for ${field.name}`);
          }
        }
        result[field.name] = values;
        break;
      }
      case "struct": {
        if (!field.structName) {
          throw new Error(`Missing structName for ${field.name}`);
        }
        const nested = decodeLayout(getStructLayout(field.structName as StructName), bytes, cursor, view);
        result[field.name] = nested.value;
        cursor = nested.offset;
        break;
      }
      default:
        throw new Error(`Decoding for wire type ${field.wireType} is not supported`);
    }
  }

  return { value: result, offset: cursor };
}

function decodePrimitive(type: StructWireType, offset: number, view: DataView) {
  switch (type) {
    case "uint8":
      return { value: view.getUint8(offset), size: 1 };
    case "sint8":
      return { value: view.getInt8(offset), size: 1 };
    case "uint16":
      return { value: view.getUint16(offset, true), size: 2 };
    case "sint16":
      return { value: view.getInt16(offset, true), size: 2 };
    case "uint32":
      return { value: view.getUint32(offset, true), size: 4 };
    case "sint32":
      return { value: view.getInt32(offset, true), size: 4 };
    case "uint64":
      return { value: view.getBigUint64(offset, true), size: 8 };
    case "sint64":
      return { value: view.getBigInt64(offset, true), size: 8 };
    default:
      throw new Error(`Decoding for primitive type ${type} is not supported`);
  }
}

function getPrimitiveSize(type: StructWireType): number {
  switch (type) {
    case "uint8":
    case "sint8":
      return 1;
    case "uint16":
    case "sint16":
      return 2;
    case "uint32":
    case "sint32":
      return 4;
    case "uint64":
    case "sint64":
      return 8;
    default:
      throw new Error(`Unsupported primitive type ${type}`);
  }
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
