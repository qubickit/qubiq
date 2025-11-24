import { readFile } from "node:fs/promises";

import type { ProposalData, ShareholderProposal } from "@types";
import { ProposalClass } from "@types";
import { z } from "zod";

import type { ProposalCoordinator } from "./proposalCoordinator";
import type { ProposalSimulationResult, ProposalTemplateRegistry } from "./registry";

const ProposalDraftSchema = z.object({
  template: z.string().min(1),
  input: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ProposalDraft = z.infer<typeof ProposalDraftSchema>;

export interface ProposalBuildResult {
  data: ProposalData;
  simulation?: ProposalSimulationResult;
  metadata?: Record<string, unknown>;
}

export interface ProposalFinalizationContext {
  summary: string;
  data: ProposalData;
  metadata?: Record<string, unknown>;
}

export function parseProposalDraft(payload: unknown): ProposalDraft {
  return ProposalDraftSchema.parse(payload);
}

export async function loadProposalDraft(path: string): Promise<ProposalDraft> {
  const raw = await readFile(path, "utf8");
  return parseProposalDraft(JSON.parse(raw));
}

export function buildProposalFromDraft(
  registry: ProposalTemplateRegistry,
  draft: ProposalDraft,
  options: { simulate?: boolean } = {},
): ProposalBuildResult {
  const data = registry.build(draft.template, draft.input);
  const simulation = options.simulate ? registry.simulate(draft.template, draft.input) : undefined;
  return {
    data,
    simulation,
    metadata: draft.metadata,
  };
}

export function simulateProposalDraft(
  registry: ProposalTemplateRegistry,
  draft: ProposalDraft,
): ProposalSimulationResult | undefined {
  return registry.simulate(draft.template, draft.input);
}

export function describeProposalData(data: ProposalData): string {
  const proposalClass = data.type & 0xf00;
  if (proposalClass === ProposalClass.Transfer && data.transferOptions) {
    const destination = data.transferOptions.destination;
    return `Transfer ${data.transferOptions.amount.toString()} QUs to ${destination}`;
  }
  if (proposalClass === ProposalClass.Variable && data.variableOptions) {
    return `Set variable ${data.variableOptions.variable} to ${data.variableOptions.value}`;
  }
  if (proposalClass === ProposalClass.GeneralOptions && data.options?.length) {
    return `Proposal (${data.options.length} options)`;
  }
  if (data.description) {
    return data.description;
  }
  return `Proposal type ${data.type}`;
}

export function describeShareholderProposal(proposal: ShareholderProposal): string {
  const status =
    typeof proposal.acceptedOption === "number"
      ? proposal.acceptedOption > 0
        ? "ACCEPTED"
        : "REJECTED"
      : "PENDING";
  const summary = describeProposalData(proposal.data);
  return `#${proposal.index} [${status}] ${summary}`;
}

export async function finalizeProposalsWithSummary(
  coordinator: Pick<ProposalCoordinator, "finalizeAcceptedProposals">,
  handler: (
    proposal: ShareholderProposal,
    context: ProposalFinalizationContext,
  ) => Promise<void> | void,
): Promise<void> {
  await coordinator.finalizeAcceptedProposals(async (proposal) => {
    await handler(proposal, {
      summary: describeShareholderProposal(proposal),
      data: proposal.data,
    });
  });
}
