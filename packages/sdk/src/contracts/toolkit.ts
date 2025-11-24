import type { LiveServiceClient } from "@qubiq/core";
import type { ContractDefinition, ContractName, StructName } from "@src/contracts/generated/contracts.generated";
import { CONTRACT_DEFINITION_MAP } from "@src/contracts/generated/contracts.generated";
import { base64ToBytes, bytesToBase64 } from "@src/utils/base64";
import { decodeStruct, encodeStructPayload, toStructName } from "./encoders";

export interface ContractCall {
  contractIndex: number;
  inputType: number;
  payload: Uint8Array;
}

export interface ContractCallResult<TOutput> {
  raw: Uint8Array;
  decoded?: TOutput;
}

type StructPayload<_T extends string | undefined> = Record<string, unknown> | undefined;

type FunctionDefinition = ContractDefinition["functions"][number];
type ProcedureDefinition = ContractDefinition["procedures"][number];

export interface ContractToolkitOptions {
  client?: LiveServiceClient;
  contractIndices?: Record<string, number>;
}

export interface UseContractOptions {
  contractIndex?: number;
}

export interface ContractToolkit {
  list(): ContractDefinition[];
  definition(name: ContractName): ContractDefinition;
  use<TName extends ContractName>(name: TName, options?: UseContractOptions): ContractBinding<TName>;
}

export interface ContractBinding<TName extends ContractName = ContractName> {
  name: TName;
  contractIndex?: number;
  definition: ContractDefinition;
  functions: Record<string, ContractFunctionBinding<StructName | undefined, StructName | undefined>>;
  procedures: Record<string, ContractProcedureBinding<StructName | undefined>>;
  withContractIndex(index: number): ContractBinding<TName>;
}

export interface ContractFunctionBinding<
  TInput extends StructName | undefined,
  TOutput extends StructName | undefined,
> {
  name: string;
  id: number;
  inputStruct?: TInput;
  outputStruct?: TOutput;
  encode(value?: StructPayload<TInput>): Uint8Array;
  decode(payload: Uint8Array): StructPayload<TOutput>;
  buildCall(value?: StructPayload<TInput>, options?: UseContractOptions): ContractCall;
  call(
    value?: StructPayload<TInput>,
    options?: UseContractOptions,
  ): Promise<ContractCallResult<StructPayload<TOutput>>>;
}

export interface ContractProcedureBinding<TInput extends StructName | undefined> {
  name: string;
  id: number;
  inputStruct?: TInput;
  encode(value?: StructPayload<TInput>): Uint8Array;
  buildCall(value?: StructPayload<TInput>, options?: UseContractOptions): ContractCall;
}

const DEFAULT_CONTRACT_INDICES: Record<string, number> = {
  ComputorControlledFund: 8,
};

export function createContractToolkit(options: ContractToolkitOptions = {}): ContractToolkit {
  const client = options.client;
  const configuredIndices = {
    ...DEFAULT_CONTRACT_INDICES,
    ...(options.contractIndices ?? {}),
  };

  return {
    list: () => Array.from(CONTRACT_DEFINITION_MAP.values()),
    definition: (name) => getContractDefinition(name),
    use: (name, useOptions) =>
      createContractBinding(getContractDefinition(name), {
        client,
        contractIndex: useOptions?.contractIndex ?? configuredIndices[name],
      }) as ContractBinding<typeof name>,
  };
}

function createContractBinding<TName extends ContractName>(
  definition: ContractDefinition,
  context: { client?: LiveServiceClient; contractIndex?: number },
): ContractBinding<TName> {
  const functions: ContractBinding["functions"] = {};
  const procedures: ContractBinding["procedures"] = {};

  for (const fn of definition.functions) {
    functions[fn.name] = createFunctionBinding(definition, fn, context);
  }

  for (const proc of definition.procedures) {
    procedures[proc.name] = createProcedureBinding(definition, proc, context);
  }

  return {
    name: definition.name as TName,
    contractIndex: context.contractIndex,
    definition,
    functions,
    procedures,
    withContractIndex: (index: number) =>
      createContractBinding(definition, {
        ...context,
        contractIndex: index,
      }),
  } as ContractBinding<TName>;
}

function createFunctionBinding(
  contract: ContractDefinition,
  fn: FunctionDefinition,
  context: { client?: LiveServiceClient; contractIndex?: number },
): ContractFunctionBinding<StructName | undefined, StructName | undefined> {
  const inputStruct = toStructName(fn.inputStruct);
  const outputStruct = toStructName(fn.outputStruct);

  const encode = (value?: StructPayload<typeof inputStruct>) =>
    encodeStructPayload(contract.name, fn.name, inputStruct, value);
  const decodePayload = (payload: Uint8Array) =>
    outputStruct ? decodeStruct(outputStruct, payload) : undefined;
  const buildCall = (value?: StructPayload<typeof inputStruct>, options?: UseContractOptions) => {
    const payload = encode(value);
    const contractIndex = resolveContractIndex(contract.name, options?.contractIndex ?? context.contractIndex);
    return {
      contractIndex,
      inputType: fn.id,
      payload,
    } satisfies ContractCall;
  };
  const call = async (
    value?: StructPayload<typeof inputStruct>,
    options?: UseContractOptions,
  ): Promise<ContractCallResult<StructPayload<typeof outputStruct>>> => {
    if (!context.client) {
      throw new Error(`No LiveServiceClient configured for ${contract.name}.${fn.name}`);
    }
    const callArgs = buildCall(value, options);
    const response = await context.client.querySmartContract({
      contractIndex: callArgs.contractIndex,
      inputType: callArgs.inputType,
      inputSize: callArgs.payload.length,
      requestData: bytesToBase64(callArgs.payload),
    });
    const raw = base64ToBytes(response.responseData);
    const decoded = outputStruct ? (decodePayload(raw) as StructPayload<typeof outputStruct>) : undefined;
    return {
      raw,
      decoded,
    } satisfies ContractCallResult<StructPayload<typeof outputStruct>>;
  };

  return {
    name: fn.name,
    id: fn.id,
    inputStruct,
    outputStruct,
    encode,
    decode: decodePayload,
    buildCall,
    call,
  };
}

function createProcedureBinding(
  contract: ContractDefinition,
  proc: ProcedureDefinition,
  context: { contractIndex?: number },
): ContractProcedureBinding<StructName | undefined> {
  const inputStruct = toStructName(proc.inputStruct);
  const encode = (value?: StructPayload<typeof inputStruct>) =>
    encodeStructPayload(contract.name, proc.name, inputStruct, value);
  const buildCall = (value?: StructPayload<typeof inputStruct>, options?: UseContractOptions): ContractCall => {
    const payload = encode(value);
    const contractIndex = resolveContractIndex(contract.name, options?.contractIndex ?? context.contractIndex);
    return {
      contractIndex,
      inputType: proc.id,
      payload,
    } satisfies ContractCall;
  };

  return {
    name: proc.name,
    id: proc.id,
    inputStruct,
    encode,
    buildCall,
  };
}

function resolveContractIndex(contractName: string, contractIndex?: number): number {
  if (typeof contractIndex === "number") {
    return contractIndex;
  }
  throw new Error(`Contract index is required to interact with ${contractName}`);
}

function getContractDefinition(name: ContractName): ContractDefinition {
  const definition = CONTRACT_DEFINITION_MAP.get(name);
  if (!definition) {
    throw new Error(`Unknown contract "${name}"`);
  }
  return definition;
}
