import { expect, test } from "bun:test";

import {
  createDefaultProposalRegistry,
  ProposalTemplateRegistry,
  VariableProposalTemplate,
} from "@proposals";

const identity = "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK";
const identityPublic = "36af16d5265b7443d798891122b91a74893752107fe0286c45856bd793e339ff";

test("default registry builds transfer proposal", () => {
  const registry = createDefaultProposalRegistry();
  const data = registry.build("transfer", {
    epoch: 42,
    destination: identity,
    amount: BigInt(100),
  });

  expect(data.epoch).toBe(42);
  expect(data.transferOptions?.destination).toBe(identityPublic);
  expect(data.transferOptions?.amount).toBe(BigInt(100));
});

test("registry simulate returns metadata", () => {
  const registry = createDefaultProposalRegistry();
  const result = registry.simulate("variable", {
    epoch: 1,
    variable: 12,
    value: 34,
  });
  expect(result?.summary).toContain("variable #12");
});

test("registry blocks duplicate template names", () => {
  const registry = new ProposalTemplateRegistry();
  registry.register("variable", VariableProposalTemplate);
  expect(() => registry.register("variable", VariableProposalTemplate)).toThrow();
});
