#!/usr/bin/env bun

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CONTRACTS_DIR = path.resolve(ROOT, "temp/qubic/core/src/contracts");
const OUTPUT_DIR = path.resolve(ROOT, "src/contracts/generated");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "MANIFEST.json");
const INDEX_PATH = path.join(OUTPUT_DIR, "contracts.generated.ts");

if (!existsSync(CONTRACTS_DIR)) {
  console.error(`[contracts] Missing contracts directory at ${CONTRACTS_DIR}`);
  process.exit(1);
}

const TYPE_MAPPING: Record<string, { tsType: string; wireType: StructWireType }> = {
  id: { tsType: "string", wireType: "string" },
  uint64: { tsType: "bigint | number | string", wireType: "uint64" },
  sint64: { tsType: "bigint | number | string", wireType: "sint64" },
  uint32: { tsType: "number", wireType: "uint32" },
  sint32: { tsType: "number", wireType: "sint32" },
  uint16: { tsType: "number", wireType: "uint16" },
  sint16: { tsType: "number", wireType: "sint16" },
  uint8: { tsType: "number", wireType: "uint8" },
  sint8: { tsType: "number", wireType: "sint8" },
  uint: { tsType: "number", wireType: "uint32" },
  bit: { tsType: "boolean", wireType: "uint8" },
  bool: { tsType: "boolean", wireType: "uint8" },
};

type StructWireType =
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "sint8"
  | "sint16"
  | "sint32"
  | "sint64"
  | "string"
  | "asset"
  | "array"
  | "struct"
  | "unknown";

type StructLayoutField = {
  name: string;
  wireType: StructWireType;
  structName?: string;
  length?: number;
  elementType?: StructWireType;
  elementStructName?: string;
};

type FunctionDefinition = {
  name: string;
  id: number;
  inputStruct?: string;
  outputStruct?: string;
};

type ContractDefinition = {
  name: string;
  header: string;
  functions: FunctionDefinition[];
  procedures: FunctionDefinition[];
};

type StructEntry = {
  name: string;
  code: string;
  layout: StructLayoutField[];
};

type TypeMappingResult = {
  tsType: string;
  structName?: string;
  layoutField: (name: string) => StructLayoutField;
};

type ContractArtifacts = {
  definition: ContractDefinition;
  structs: StructEntry[];
  fileStem: string;
  definitionConst: string;
  structMapType: string;
  structLayoutsConst: string;
};

function toTsLiteral(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value
      .map((item) => `${pad}  ${toTsLiteral(item, indent + 2)},`)
      .join("\n");
    return `[\n${items}\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries
      .map(([key, val]) => `${pad}  ${key}: ${toTsLiteral(val, indent + 2)},`)
      .join("\n");
    return `{\n${lines}\n${pad}}`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function main() {
  prepareOutputDir();
  const headers = readdirSync(CONTRACTS_DIR).filter((file) => file.endsWith(".h"));
  const artifacts: ContractArtifacts[] = [];
  const manifestEntries: Array<{ name: string; header: string; file: string; functions: number; procedures: number }> = [];

  for (const header of headers) {
    const fullPath = path.join(CONTRACTS_DIR, header);
    const content = readFileSync(fullPath, "utf8");
    const definition = parseContract(header, content);
    const structEntries = collectStructs(definition.name, content);
    const fileStem = toKebab(definition.name);
    const filePath = path.join(OUTPUT_DIR, `${fileStem}.ts`);
    const definitionConst = `${toPascal(definition.name)}Definition`;
    const structMapType = `${toPascal(definition.name)}StructMap`;
    const structLayoutsConst = `${toPascal(definition.name)}StructLayouts`;

    writeFileSync(filePath, renderContractFile(fullPath, definitionConst, structMapType, structLayoutsConst, definition, structEntries));

    artifacts.push({ definition, structs: structEntries, fileStem, definitionConst, structMapType, structLayoutsConst });
    manifestEntries.push({
      name: definition.name,
      header,
      file: `${fileStem}.ts`,
      functions: definition.functions.length,
      procedures: definition.procedures.length,
    });
  }

  writeIndexFile(artifacts);
  writeManifest(manifestEntries);
  formatGeneratedOutputs();
  console.log(`[contracts] Generated payload metadata for ${artifacts.length} contract headers.`);
}

function prepareOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  for (const file of readdirSync(OUTPUT_DIR)) {
    if (file.endsWith(".ts") && file !== "README.md") {
      unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }
}

function parseContract(headerFile: string, source: string): ContractDefinition {
  const name = headerFile.replace(/\.h(pp)?$/, "");
  const functions = extractRegistrations(source, /REGISTER_USER_FUNCTION\(\s*([A-Za-z0-9_]+)\s*,\s*(\d+)\s*\)/g);
  const procedures = extractRegistrations(source, /REGISTER_USER_PROCEDURE\(\s*([A-Za-z0-9_]+)\s*,\s*(\d+)\s*\)/g);
  const structBodies = extractStructBodies(source);

  const attachStructs = (entry: FunctionDefinition): FunctionDefinition => ({
    ...entry,
    inputStruct: structBodies.has(`${entry.name}_input`) ? `${name}_${entry.name}_input` : undefined,
    outputStruct: structBodies.has(`${entry.name}_output`) ? `${name}_${entry.name}_output` : undefined,
  });

  return {
    name,
    header: headerFile,
    functions: functions.map(attachStructs),
    procedures: procedures.map(attachStructs),
  };
}

function collectStructs(contractName: string, source: string): StructEntry[] {
  const structBodies = extractStructBodies(source);
  const cache = new Map<string, StructEntry>();

  const build = (fullName: string, body: string): StructEntry => {
    if (cache.has(fullName)) return cache.get(fullName)!;

    const fields: string[] = [];
    const layout: StructLayoutField[] = [];
    const localStructs = new Map<string, string>();
    let processed = body.replace(/\r/g, "");

    processed = processed.replace(/struct\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\};/g, (_match, nestedName, nestedBody) => {
      if (typeof nestedName === "string" && typeof nestedBody === "string") {
        const nestedFullName = `${fullName}_${nestedName}`;
        localStructs.set(nestedName, nestedFullName);
        build(nestedFullName, nestedBody);
      }
      return "";
    });

    let buffer = "";
    for (const rawLine of processed.split("\n")) {
      const line = rawLine.split("//")[0]?.trim();
      if (!line) continue;
      buffer += `${line} `;
      if (line.endsWith(";")) {
        const normalized = buffer.replace(/;/g, "").trim();
        buffer = "";
        const match = normalized.match(/^([A-Za-z0-9_<>,\s]+)\s+([A-Za-z0-9_]+)$/);
        if (!match) continue;
        const [, type, name] = match;
        const mapping = mapType(type, localStructs);
        fields.push(`  ${name}: ${mapping.tsType};`);
        layout.push(mapping.layoutField(name));
      }
    }

    const interfaceBody = fields.length ? fields.join("\n") : "  [key: string]: unknown;";
    const code = `export interface ${fullName} {\n${interfaceBody}\n}\n`;
    const entry = { name: fullName, code, layout };
    cache.set(fullName, entry);
    return entry;
  };

  for (const [shortName, body] of structBodies.entries()) {
    build(`${contractName}_${shortName}`, body);
  }
  return Array.from(cache.values());
}

function extractRegistrations(source: string, regex: RegExp): FunctionDefinition[] {
  const matches = [...source.matchAll(regex)];
  return matches.map((match) => ({ name: match[1]!, id: Number(match[2]) }));
}

function extractStructBodies(source: string): Map<string, string> {
  const structs = new Map<string, string>();
  const regex = /struct\s+([A-Za-z0-9_]+)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const structName = match[1]!;
    if (!/_(input|output)$/i.test(structName)) {
      continue;
    }
    let cursor = regex.lastIndex;
    let depth = 1;
    while (depth > 0 && cursor < source.length) {
      const char = source[cursor++];
      if (char === "{") depth++;
      else if (char === "}") depth--;
    }
    const body = source.slice(regex.lastIndex, cursor - 1).trim();
    structs.set(structName, body);
    regex.lastIndex = cursor;
  }

  return structs;
}

function mapType(type: string, localStructs: Map<string, string>): TypeMappingResult {
  const normalized = type.replace(/\s+/g, "").replace(/class|struct/g, "");
  const arrayMatch = normalized.match(/^Array<([^,>]+),([0-9]+)>$/i);
  if (arrayMatch) {
    const elementType = arrayMatch[1]!;
    const length = Number(arrayMatch[2]);
    const elementMapping: TypeMappingResult = mapType(elementType, localStructs);
    const tsElementType: string = elementMapping.tsType.includes("|") && !elementMapping.tsType.trim().startsWith("(")
      ? `(${elementMapping.tsType})`
      : elementMapping.tsType;
    return {
      tsType: `${tsElementType}[]`,
      layoutField: (name: string): StructLayoutField => {
        const sample = elementMapping.layoutField(`${name}_item`);
        const field: StructLayoutField = {
          name,
          wireType: "array",
          length,
          elementType: sample.wireType,
        };
        if (sample.structName) {
          field.elementStructName = sample.structName;
        }
        return field;
      },
      structName: elementMapping.structName,
    };
  }

  if (localStructs.has(normalized)) {
    const structName = localStructs.get(normalized)!;
    return {
      tsType: structName,
      structName,
      layoutField: (name: string): StructLayoutField => ({ name, wireType: "struct", structName }),
    };
  }

  if (TYPE_MAPPING[normalized]) {
    const mapping = TYPE_MAPPING[normalized];
    return {
      tsType: mapping.tsType,
      layoutField: (name: string): StructLayoutField => ({ name, wireType: mapping.wireType }),
    };
  }

  if (normalized === "Asset") {
    return {
      tsType: "{ issuer: string; assetName: bigint | number | string }",
      layoutField: (name: string): StructLayoutField => ({ name, wireType: "asset" }),
    };
  }

  return {
    tsType: "unknown",
    layoutField: (name: string): StructLayoutField => ({ name, wireType: "unknown" }),
  };
}

function renderContractFile(
  sourcePath: string,
  definitionConst: string,
  structMapType: string,
  structLayoutsConst: string,
  definition: ContractDefinition,
  structs: StructEntry[],
) {
  const header = `// Auto-generated by scripts/gen-contract-types.ts\n// Source: ${path.relative(
    ROOT,
    sourcePath,
  )}\n// Do not edit manually.\n\n`;
  const definitionBlock = `export const ${definitionConst} = ${toTsLiteral(definition)} as const;\n\n`;
  const interfaces = structs.map((entry) => entry.code).join("\n");
  const structMapBlock = structs.length
    ? `export type ${structMapType} = {\n${structs.map((entry) => `  ${entry.name}: ${entry.name};`).join("\n")}\n};\n\n`
    : `export type ${structMapType} = Record<string, never>;\n\n`;
  const layoutObject = Object.fromEntries(structs.map((entry) => [entry.name, entry.layout]));
  const structLayoutsBlock = `export const ${structLayoutsConst} = ${toTsLiteral(layoutObject)} as const;\n`;

  return `${header}${definitionBlock}${interfaces}\n${structMapBlock}${structLayoutsBlock}`;
}

function serializeLayout(fields: StructLayoutField[]): string {
  if (!fields.length) return "";
  return fields
    .map((field) => {
      const props = [`name: ${JSON.stringify(field.name)}`, `wireType: ${JSON.stringify(field.wireType)}`];
      if (field.structName) props.push(`structName: ${JSON.stringify(field.structName)}`);
      if (typeof field.length === "number") props.push(`length: ${field.length}`);
      if (field.elementType) props.push(`elementType: ${JSON.stringify(field.elementType)}`);
      if (field.elementStructName) props.push(`elementStructName: ${JSON.stringify(field.elementStructName)}`);
      return `{ ${props.join(", ")} }`;
    })
    .join(", ");
}

function writeIndexFile(artifacts: ContractArtifacts[]) {
  const sorted = [...artifacts].sort((a, b) => a.fileStem.localeCompare(b.fileStem));
  const imports = sorted
    .map((artifact) => {
      const importPath = `./${artifact.fileStem}`;
      return `import type { ${artifact.structMapType} } from "${importPath}";\nimport { ${artifact.definitionConst} } from "${importPath}";`;
    })
    .join("\n");

  const reExports = sorted.map((artifact) => `export * from "./${artifact.fileStem}";`).join("\n");
  const definitionsArray = sorted.map((artifact) => `  ${artifact.definitionConst},`).join("\n");
  const structMapType = sorted.length
    ? sorted.map((artifact) => artifact.structMapType).join(" & ")
    : "Record<string, never>";

  const combinedLayouts: Record<string, StructLayoutField[]> = {};
  for (const artifact of sorted) {
    for (const struct of artifact.structs) {
      combinedLayouts[struct.name] = struct.layout;
    }
  }

  const content = `// Auto-generated by scripts/gen-contract-types.ts. Do not edit manually.\n\n${imports}\n\n${reExports}\n\nexport const CONTRACT_DEFINITIONS = [\n${definitionsArray}\n] as const;\n\nexport type ContractDefinition = typeof CONTRACT_DEFINITIONS[number];\nexport type ContractName = ContractDefinition["name"];\n\nexport const CONTRACT_DEFINITION_MAP = new Map(\n  CONTRACT_DEFINITIONS.map((definition) => [definition.name, definition]),\n);\nexport const CONTRACT_DEFINITION_BY_HEADER = new Map(\n  CONTRACT_DEFINITIONS.map((definition) => [definition.header, definition]),\n);\n\nexport type GeneratedStructMap = ${structMapType};\nexport type StructName = keyof GeneratedStructMap;\nexport type StructFromName<T extends StructName> = GeneratedStructMap[T];\n\nexport const STRUCT_LAYOUTS = ${toTsLiteral(combinedLayouts)} as const;\n`;

  writeFileSync(INDEX_PATH, content);
}

function writeManifest(entries: Array<{ name: string; header: string; file: string; functions: number; procedures: number }>) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    contracts: entries,
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function formatGeneratedOutputs() {
  const result = spawnSync("bunx", ["biome", "format", "src/contracts/generated", "--write"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.warn("[contracts] biome format failed; please run `bunx biome format src/contracts/generated --write` manually");
  }
}

function toKebab(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function toPascal(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9]+/g, " ").trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
    || "Contract";
}

main();
