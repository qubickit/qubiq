import {
  IdentityStringSchema,
  ProposalClass,
  ProposalDataSchema,
  ProposalVariableOptionsSchema,
} from "@types";
import { normalizePublicKeyHex } from "@wallet/identity";
import { z } from "zod";

import type { ProposalTemplateDefinition } from "./registry";
import { ProposalTemplateRegistry } from "./registry";

const NonNegativeInt = z.number().int().nonnegative();
const DescriptionField = z.string().max(1024).optional();

const AmountValueSchema = z
  .union([
    z.bigint(),
    z.number().int().nonnegative(),
    z.string().regex(/^\d+$/, "amount string must be numeric"),
  ])
  .transform((value) => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    return BigInt(value);
  });

const HexPublicKeySchema = z.string().regex(/^[0-9a-fA-F]{64}$/, "destination must be 32-byte hex");

const DestinationSchema = z.union([IdentityStringSchema, HexPublicKeySchema]);

const TransferProposalInputSchema = z.object({
  epoch: NonNegativeInt,
  description: DescriptionField,
  destination: DestinationSchema,
  amount: AmountValueSchema,
});
export type TransferProposalInput = z.infer<typeof TransferProposalInputSchema>;

const VariableProposalInputSchema = z.object({
  epoch: NonNegativeInt,
  description: DescriptionField,
  variable: z.number().int().nonnegative(),
  value: z
    .union([z.bigint(), z.number().int()])
    .transform((value) => (typeof value === "bigint" ? value : BigInt(value))),
});
export type VariableProposalInput = z.infer<typeof VariableProposalInputSchema>;

export const TransferProposalTemplate: ProposalTemplateDefinition<TransferProposalInput> = {
  schema: TransferProposalInputSchema,
  build: (input) =>
    ProposalDataSchema.parse({
      epoch: input.epoch,
      type: ProposalClass.Transfer,
      description: input.description,
      transferOptions: {
        destination: HexPublicKeySchema.safeParse(input.destination).success
          ? input.destination.toLowerCase()
          : normalizePublicKeyHex(input.destination),
        amount: input.amount,
      },
    }),
  simulate: (input) => ({
    summary: `Transfer ${input.amount.toString()} QUBIC to ${input.destination}`,
    metadata: {
      destination: input.destination,
      amount: input.amount.toString(),
    },
  }),
};

export const VariableProposalTemplate: ProposalTemplateDefinition<VariableProposalInput> = {
  schema: VariableProposalInputSchema,
  build: (input) => {
    const parsedOptions = ProposalVariableOptionsSchema.parse({
      variable: input.variable,
      value: Number(input.value),
    });
    return ProposalDataSchema.parse({
      epoch: input.epoch,
      type: ProposalClass.Variable,
      description: input.description,
      variableOptions: parsedOptions,
    });
  },
  simulate: (input) => ({
    summary: `Set variable #${input.variable} to ${input.value.toString()}`,
    metadata: {
      variable: input.variable,
      value: input.value.toString(),
    },
  }),
};

export function createDefaultProposalRegistry() {
  const registry = new ProposalTemplateRegistry();
  registry.register("transfer", TransferProposalTemplate);
  registry.register("variable", VariableProposalTemplate);
  return registry;
}
