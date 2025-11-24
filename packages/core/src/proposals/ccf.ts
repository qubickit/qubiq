import type { LiveServiceClient } from "@clients/http/liveServiceClient";
import { base64ToBytes, bytesToBase64 } from "@src/utils/base64";
import { bytesToHex } from "@src/utils/bytes";
import type { ShareholderProposal } from "@types";
import { ShareholderProposalSchema } from "@types";

export interface CcfProposalFetchResult {
  proposals: ShareholderProposal[];
  epoch: number;
  networkEpoch: number;
  activeIndices: number[];
  finishedIndices: number[];
}

const CCF_CONTRACT_INDEX = 8;

export async function fetchCcfProposalsFromContract(
  client: LiveServiceClient,
  epochOverride?: number,
): Promise<CcfProposalFetchResult> {
  const { tickInfo } = await client.getTickInfo();
  const networkEpoch = tickInfo.epoch;
  const targetEpoch = epochOverride ?? networkEpoch;

  const activeIndices = await fetchCcfIndices(client, true);
  const finishedIndices = await fetchCcfIndices(client, false);
  const indices = [...activeIndices, ...finishedIndices];

  const proposals: ShareholderProposal[] = [];
  for (const index of indices) {
    const proposal = await fetchCcfProposal(client, index);
    proposals.push(proposal);
  }

  return {
    proposals: proposals.filter((proposal) => proposal.data.epoch === targetEpoch),
    epoch: targetEpoch,
    networkEpoch,
    activeIndices,
    finishedIndices,
  };
}

async function fetchCcfIndices(client: LiveServiceClient, active: boolean): Promise<number[]> {
  const indices: number[] = [];
  let prev = -1;

  while (true) {
    const input = encodeGetProposalIndicesInput(active, prev);
    const bytes = await callContractFunction(client, CCF_CONTRACT_INDEX, 1, input);
    const chunk = decodeGetProposalIndicesOutput(bytes);
    if (chunk.length === 0) break;
    indices.push(...chunk);
    prev = chunk[chunk.length - 1] ?? prev;
    if (chunk.length < 64) break;
  }

  return indices;
}

async function fetchCcfProposal(
  client: LiveServiceClient,
  proposalIndex: number,
): Promise<ShareholderProposal> {
  const input = encodeUint16Input(proposalIndex);
  const raw = await callContractFunction(client, CCF_CONTRACT_INDEX, 2, input);
  const decoded = decodeGetProposalOutput(raw, proposalIndex);
  if (!decoded.okay) {
    throw new Error(`CCF reported failure when fetching proposal ${proposalIndex}`);
  }
  return decoded.proposal;
}

async function callContractFunction(
  client: LiveServiceClient,
  contractIndex: number,
  inputType: number,
  payload: Uint8Array,
) {
  const response = await client.querySmartContract({
    contractIndex,
    inputType,
    inputSize: payload.length,
    requestData: bytesToBase64(payload),
  });
  return base64ToBytes(response.responseData);
}

function encodeGetProposalIndicesInput(active: boolean, prevIndex: number) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint8(0, active ? 1 : 0);
  view.setInt32(4, prevIndex, true);
  return new Uint8Array(buffer);
}

function encodeUint16Input(value: number) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint16(0, value, true);
  return new Uint8Array(buffer);
}

function decodeGetProposalIndicesOutput(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(0, true);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(view.getUint16(2 + i * 2, true));
  }
  return indices;
}

function decodeGetProposalOutput(
  bytes: Uint8Array,
  proposalIndex: number,
): {
  okay: boolean;
  proposal: ShareholderProposal;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const okay = view.getUint8(0) === 1;
  const proposerOffset = 8;
  const proposalOffset = proposerOffset + 32;
  const proposalBytes = bytes.slice(proposalOffset, proposalOffset + 304);

  const dataView = new DataView(
    proposalBytes.buffer,
    proposalBytes.byteOffset,
    proposalBytes.byteLength,
  );
  const urlBytes = proposalBytes.slice(0, 256);
  const url = decodeNullTerminatedString(urlBytes);
  const epoch = dataView.getUint16(256, true);
  const type = dataView.getUint16(258, true);
  const tick = dataView.getUint32(260, true);
  const destinationBytes = proposalBytes.slice(264, 296);
  const amount = dataView.getBigInt64(296, true);
  const destination = bytesToHex(destinationBytes);

  const proposal = ShareholderProposalSchema.parse({
    index: proposalIndex,
    data: {
      epoch,
      type,
      description: url.length > 0 ? url : `Proposal set at tick ${tick}`,
      transferOptions: {
        destination,
        amount,
      },
    },
  });

  return {
    okay,
    proposal,
  };
}

function decodeNullTerminatedString(bytes: Uint8Array): string {
  const endIndex = bytes.indexOf(0);
  const slice = endIndex >= 0 ? bytes.slice(0, endIndex) : bytes;
  if (slice.length === 0) return "";
  return new TextDecoder().decode(slice);
}
