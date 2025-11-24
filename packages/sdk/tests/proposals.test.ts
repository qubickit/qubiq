import { describe, expect, test } from "bun:test";
import { createProposalToolkit } from "../src/index";

class MockLiveClient {
  async getTickInfo() {
    return { tickInfo: { epoch: 200 } };
  }
  async querySmartContract() {
    return { responseData: "" };
  }
}

describe("proposals toolkit", () => {
  test("summaries include indices", async () => {
    const toolkit = createProposalToolkit(new MockLiveClient() as any);
    const summaries = toolkit.summarize([
      {
        index: 1,
        data: { epoch: 200, type: 0x100, transferOptions: { destination: "SUZ...", amount: 1n } },
      } as any,
    ]);
    expect(summaries[0]).toContain("#1");
  });
});
