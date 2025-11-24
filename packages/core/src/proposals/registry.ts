import type { ProposalData } from "@types";
import { ProposalDataSchema } from "@types";
import type { z } from "zod";

export interface ProposalSimulationResult {
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface ProposalTemplateDefinition<TInput> {
  schema: z.ZodType<TInput>;
  build(input: TInput): ProposalData;
  simulate?(input: TInput): ProposalSimulationResult;
}

interface RegisteredTemplate<TInput> extends ProposalTemplateDefinition<TInput> {}

export class ProposalTemplateRegistry {
  private readonly templates = new Map<string, RegisteredTemplate<unknown>>();

  register<TInput>(name: string, definition: ProposalTemplateDefinition<TInput>): this {
    if (this.templates.has(name)) {
      throw new Error(`Proposal template "${name}" is already registered`);
    }
    this.templates.set(name, definition);
    return this;
  }

  list(): string[] {
    return Array.from(this.templates.keys());
  }

  build<_TInput>(name: string, input: unknown): ProposalData {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Unknown proposal template "${name}"`);
    }
    const parsed = template.schema.parse(input);
    return ProposalDataSchema.parse(template.build(parsed));
  }

  simulate<_TInput>(name: string, input: unknown) {
    const template = this.templates.get(name);
    if (!template?.simulate) {
      return undefined;
    }
    const parsed = template.schema.parse(input);
    return template.simulate(parsed);
  }
}
