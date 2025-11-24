import { describe, expect, test } from "bun:test";
import { createContractToolkit, encodeStruct } from "../src/index";
import type { LiveServiceClient } from "@qubiq/core";
import { Buffer } from "node:buffer";

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

class MockLiveServiceClient {
  constructor(private readonly responses: Record<string, string>) {}

  async querySmartContract(payload: {
    contractIndex: number;
    inputType: number;
    inputSize: number;
    requestData: string;
  }) {
    const key = `${payload.contractIndex}:${payload.inputType}:${payload.requestData}`;
    const responseData = this.responses[key];
    if (!responseData) {
      throw new Error(`No mock response for ${key}`);
    }
    return { responseData };
  }
}

describe("contract toolkit", () => {
  test("call() encodes payload and decodes result", async () => {
    const requestPayload = encodeStruct("ComputorControlledFund_GetProposalIndices_input", {
      activeProposals: true,
      prevProposalIndex: -1,
    });

    const responseStruct = encodeStruct("ComputorControlledFund_GetProposalIndices_output", {
      numOfIndices: 1,
      indices: [5, ...Array(63).fill(0)],
    });

    const toolkit = createContractToolkit({
      client: new MockLiveServiceClient({
        [`8:1:${toBase64(requestPayload)}`]: toBase64(responseStruct),
      }) as unknown as LiveServiceClient,
    });

    const binding = toolkit.use("ComputorControlledFund");
    const result = await binding.functions.GetProposalIndices.call({
      activeProposals: true,
      prevProposalIndex: -1,
    });

    expect(result.decoded?.numOfIndices).toBe(1);
    expect(result.decoded?.indices[0]).toBe(5);
  });

  test("encodeStruct returns expected byte length", () => {
    const bytes = encodeStruct("ComputorControlledFund_GetProposalIndices_input", {
      activeProposals: true,
      prevProposalIndex: -1,
    });
    expect(bytes.length).toBe(5);
  });
});
