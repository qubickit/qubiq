import { expect, test } from "bun:test";

import {
  decodeRequestResponseHeader,
  encodeRequestResponseHeader,
} from "@serialization/requestHeader";

import type { RequestResponseHeader } from "@types";

test("request header encodes to 8 bytes", () => {
  const header: RequestResponseHeader = { size: 512, type: 24, dejavu: 123456 };
  const encoded = encodeRequestResponseHeader(header);
  expect(encoded.length).toBe(8);
  const decoded = decodeRequestResponseHeader(encoded);
  expect(decoded).toEqual(header);
});

test("request header rejects oversize payloads", () => {
  const header: RequestResponseHeader = { size: 0x2000000, type: 1, dejavu: 1 };
  expect(() => encodeRequestResponseHeader(header)).toThrow();
});
