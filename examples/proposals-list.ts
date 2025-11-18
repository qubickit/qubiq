#!/usr/bin/env bun
import type { ShareholderProposal } from "../src";
import { LiveServiceClient, ProposalClass, publicKeyHexToIdentity } from "../src";
import { fetchCcfProposalsFromContract } from "../src/proposals/ccf";

type CcfProposal = ShareholderProposal;

const argv = process.argv.slice(2);
const SHOW_HELP = argv.includes("--help") || argv.includes("-h");
const BASE_URL_FLAG = argv.find((arg) => arg.startsWith("--base-url="));
const BASE_URL = process.env.QUBIC_LIVE_URL ?? BASE_URL_FLAG?.split("=")?.[1];
const EPOCH_FLAG = argv.find((arg) => arg.startsWith("--epoch="));
const EPOCH_OVERRIDE = EPOCH_FLAG ? Number.parseInt(EPOCH_FLAG.split("=")[1] ?? "", 10) : undefined;

async function run() {
  if (SHOW_HELP) {
    console.log(`Usage: bun run example:proposals [options]

Options:
  --base-url=URL  Override live service base URL (defaults to https://api.qubic.org)
  --epoch=N       Force a specific epoch when filtering proposals (CCF only)
  -h, --help      Show this help message

Environment:
  QUBIC_LIVE_URL Base URL for live-service HTTP API (defaults to https://api.qubic.org).

This script queries the Computor Controlled Fund (contract index 8) directly.`);
    return;
  }

  const client = new LiveServiceClient({ baseUrl: BASE_URL });
  const {
    proposals,
    epoch: filteredEpoch,
    networkEpoch,
    activeIndices,
    finishedIndices,
  } = await fetchCcfProposalsFromContract(client, EPOCH_OVERRIDE);
  console.log(
    `Fetched ${activeIndices.length} active and ${finishedIndices.length} finished proposals via CCF contract.`,
  );
  if (EPOCH_OVERRIDE !== undefined && EPOCH_OVERRIDE !== networkEpoch) {
    console.log(
      `Epoch override ${EPOCH_OVERRIDE} does not match live epoch ${networkEpoch}; results reflect archived proposals only.`,
    );
  }
  console.log(`Filtering proposals for epoch ${filteredEpoch}.`);

  if (proposals.length === 0) {
    console.log(`No proposals to display for epoch ${filteredEpoch}.`);
    return;
  }

  if (activeIndices.length === 0) {
    console.log("No active proposals at the moment.");
    return;
  }

  console.log(`Active proposal indices: ${activeIndices.join(", ")}`);
  const activeSet = new Set(activeIndices);
  const activeProposals = proposals.filter((proposal) => activeSet.has(proposal.index));
  if (activeProposals.length === 0) {
    console.log("No active proposals for the selected epoch.");
    return;
  }

  console.log("Top proposals:");
  const descriptions = await Promise.all(
    activeProposals.slice(0, 5).map((proposal) => describeCcfProposal(proposal)),
  );
  for (const line of descriptions) {
    console.log(line);
  }
}

run().catch((error) => {
  console.error("Failed to list proposals", error);
  process.exit(1);
});

async function describeCcfProposal(proposal: CcfProposal): Promise<string> {
  return formatCcfProposal(proposal);
}

function formatAmount(amount: bigint): string {
  return amount.toLocaleString("en-US");
}

async function formatCcfProposal(proposal: CcfProposal): Promise<string> {
  const transfer = proposal.data.transferOptions;
  const desc = proposal.data.description ? ` — ${proposal.data.description}` : "";
  const status =
    typeof proposal.acceptedOption === "number"
      ? proposal.acceptedOption > 0
        ? "ACCEPTED"
        : "REJECTED"
      : "PENDING";

  if (!transfer || ProposalClass.Transfer !== (proposal.data.type & 0xf00)) {
    return `#${proposal.index} [${status}] Non-transfer proposal${desc}`;
  }

  let destinationLabel = transfer.destination;
  try {
    const identity = await publicKeyHexToIdentity(transfer.destination);
    destinationLabel = `${identity} (${transfer.destination})`;
  } catch {
    // ignore conversion failure
  }

  return `#${proposal.index} [${status}] Transfer ${formatAmount(
    transfer.amount,
  )} QUs to ${destinationLabel}${desc}`;
}
