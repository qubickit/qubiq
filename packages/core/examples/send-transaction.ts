#!/usr/bin/env bun
import { createWalletFromSeed, QubicNodeClient } from "../src";

interface SendOptions {
  seed: string;
  destination: string;
  amount: bigint;
  tickOffset: number;
  broadcast: boolean;
}

async function send({ seed, destination, amount, tickOffset, broadcast }: SendOptions) {
  const client = new QubicNodeClient();
  const wallet = await createWalletFromSeed(seed);
  const currentTick = (await client.getTickInfo()).tickInfo.tick;

  const signed = await wallet.signTransfer({
    destinationPublicKey: destination,
    amount,
    tick: currentTick + tickOffset,
  });

  const base64Tx = Buffer.from(signed.bytes).toString("base64");

  console.log("Source identity:", wallet.identity);
  console.log("Source public key:", wallet.publicKey);
  console.log("Destination public key:", destination);
  console.log("Amount (QUBIC):", amount.toString());
  console.log("Tick:", signed.tick);
  console.log("Digest:", signed.digest);
  console.log("Signature:", signed.signature);
  console.log("Prepared transaction (base64):", base64Tx);

  if (broadcast) {
    const response = await client.broadcastTransaction({
      encodedTransaction: base64Tx,
    });
    console.log("Broadcast accepted with txId:", response.transactionId);
  } else {
    console.log("Dry-run only. Pass --broadcast to submit to the network.");
  }
}

const [seed, destination, amountStr, ...rest] = process.argv.slice(2);

if (!seed || !destination || !amountStr) {
  console.error(
    "Usage: bun run example:send <seed> <destinationPublicKeyHex> <amount> [tickOffset|--tick-offset=N] [--broadcast]",
  );
  process.exit(1);
}

let tickOffset = 10;
let broadcast = false;

for (const arg of rest) {
  if (arg === "--broadcast") {
    broadcast = true;
  } else if (arg.startsWith("--tick-offset=")) {
    tickOffset = Number.parseInt(arg.split("=")[1] ?? "", 10);
  } else if (!Number.isNaN(Number(arg))) {
    tickOffset = Number(arg);
  }
}

if (!Number.isFinite(tickOffset) || tickOffset < 0) {
  console.error("tickOffset must be a positive integer");
  process.exit(1);
}

send({
  seed,
  destination,
  amount: BigInt(amountStr),
  tickOffset,
  broadcast,
}).catch((error) => {
  console.error("Failed to build transaction", error);
  process.exit(1);
});
