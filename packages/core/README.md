# NexaKit Core

`@nexakit/core` is the TypeScript toolkit that mirrors the Qubic node lifecycle—deterministic wallets (FourQ/K12 WASM), HTTP clients, automation pipelines, proposal tooling, and observability helpers.

## Where to start

| Resource    | URL                                          | Notes                                                            |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------- |
| Docs site   | https://core.nexakit.dev                     | Primary reference (Getting Started, modules, interop, telemetry) |
| API package | https://www.npmjs.com/package/@nexakit/core | Install in Bun/Node projects                                     |
| Examples    | `examples/`                                  | Runnable scripts mirrored in the docs                            |

## Quickstart

```bash
bun add @nexakit/core
```

```ts
import { QubicNodeClient, deriveWalletFromSeed } from "@nexakit/core";

const client = new QubicNodeClient();
const wallet = await deriveWalletFromSeed(process.env.QUBIC_SEED!);
const tick = (await client.getTickInfo()).tickInfo.tick;

const signed = await wallet.signTransfer({
  destinationPublicKey: wallet.publicKey,
  amount: BigInt(1_000_000),
  tick: tick + 10,
});

await client.broadcastTransaction({
  encodedTransaction: Buffer.from(signed.bytes).toString("base64"),
});
```

More scenarios—automation pipelines, proposal workflows, observability—are documented on the site. Note: public Qubic infrastructure currently exposes only the HTTP API; the gRPC client is intended for self-hosted nodes that make the proto available.

## Local development

### Docs app (`packages/web`)

```bash
cd ../web
bun install
bun dev  # serves https://core.nexakit.dev locally
```

The site uses Fumadocs + Next.js App Router. Content lives under `packages/web/content/docs`.

### Core package

The TypeScript sources are under `src/`. Tests run with Bun:

```bash
bun test       # full suite
bun test path/to/file.test.ts
```

CI mirrors this command. Integration tests rely on local mock servers (no public network access required unless you opt into smoke tests with `QUBIC_SMOKE_TESTS=true`).

## Package layout

| Path        | Description                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `src/`      | Core library: connectors, serialization, wallets, automation, proposals, monitoring, interop clients |
| `proto/`    | Canonical `live_service.proto` used by both HTTP and gRPC layers                                     |
| `tests/`    | Bun test suites (unit, integration, automation, interop, smoke)                                      |
| `examples/` | Runnable scripts referenced by the docs                                                              |
| `../web/`   | Next.js/Fumadocs site served at https://core.nexakit.dev                                             |

## Contributing

1. Fork and clone the repo.
2. Install dependencies (`bun install` at the repo root; workspace tooling links every package).
3. Run `bun run -cwd packages/core lint` + `bun run -cwd packages/core test` (or use the root helper scripts).
4. Open a PR describing the change and any docs updates.

Issues/ideas? Open a ticket or ping `alez` on Discord. Contributions to both the core library and the documentation site are welcome.
