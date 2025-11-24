import { expect, test } from "bun:test";

const SMOKE = process.env.QUBIC_SMOKE_TESTS === "true";
const maybeTest = SMOKE ? test : test.skip;

maybeTest("live service smoke: tick info", async () => {
  const response = await fetch("https://api.qubic.org/v1/tick-info");
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(typeof data.tickInfo?.tick).toBe("number");
  expect(data.tickInfo.tick).toBeGreaterThan(0);
});

maybeTest("live service smoke: balance endpoint", async () => {
  const identity = "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK";
  const response = await fetch(`https://api.qubic.org/v1/balances/${identity}`);
  expect(response.ok).toBe(true);
  const data = await response.json();
  expect(data.balance).toBeDefined();
});
