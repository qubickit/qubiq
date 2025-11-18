# @qubickit/core Full Roadmap

This document sketches a roadmap for the TypeScript/QubicKit wrapper around the native Qubic node implementation (`/qubic/core`). The goal is to provide `@qubickit/core` users with three pillars: (1) stable node connectors, (2) encoder/decoder utilities for every core type, and (3) a friendly wrapper surface that mirrors the native lifecycle described in `SEAMLESS.md` and `doc/contracts_proposals.md`.

## Vision

A TypeScript SDK should feel like a natural extension of the C++ node: it boots a connector, performs deterministic serialization, and mirrors the epoch-driven workflow that lets operators transition across protocol versions. By staying idiomatic to TypeScript (buffers, typed interfaces, async/await), `@qubickit/core` can serve dApps, CLI tools, and cross-platform runtimes without forcing consumers to step into the bare-metal C++ stack.

## Architecture Overview

`@qubickit/core` organizes into three layers:

1. **Connector layer** – manages TCP reachability, message framing (headers + dejavu), and tick scheduling so the library stays in lockstep with the native node’s 1,000ms clock.
2. **Serialization layer** – defines every wire structure (`RequestResponseHeader`, `Transaction`, `EntityRecord`, proposal payloads) and provides `encode/decode` helpers that validate field sizes via Zod schemas while mirroring native byte layouts exactly.
3. **Wrapper layer** – bundles connectors+encoders into high-level APIs (`QuBicNodeClient`, `ProposalCoordinator`, `BootModeManager`) so users can broadcast transactions, read proposals, and trigger finalizers with minimal boilerplate.

## Quickstart

```bash
bun add @qubickit/core
```

```ts
import { BootManager, BootMode, QubicNodeClient, deriveWalletFromSeed } from "@qubickit/core";

const boot = new BootManager();
const decision = await boot.decide();
console.log(`Start flag: ${decision.flag}`);

const wallet = await deriveWalletFromSeed("wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt");
console.log("Identity", wallet.identity);

const client = new QubicNodeClient();
const balance = await client.getBalance("A".repeat(60));
console.log(balance.balance.balance);

const watcher = client.watchWallet("A".repeat(60));
watcher.on("balanceChanged", ({ current }) => {
  console.log("new balance", current.balance);
});
```

Serialization helpers let you craft transactions manually when needed:

```ts
import { encodeTransaction } from "@qubickit/core";

const raw = encodeTransaction({
  sourcePublicKey: "ab".repeat(32),
  destinationPublicKey: "cd".repeat(32),
  amount: BigInt(1000),
  tick: 123,
  inputType: 0,
  inputSize: 0,
  signature: "ef".repeat(64),
});
```

To let the library derive keys and sign transactions directly from a 55-character seed:

```ts
import { QubicNodeClient, createWalletFromSeed } from "@qubickit/core";

const client = new QubicNodeClient();
const wallet = await createWalletFromSeed("wqbdupxgcaimwdsnchitjmsplzclkqokhadgehdxqogeeiovzvadstt");
const tick = (await client.getTickInfo()).tickInfo.tick;

const signed = await wallet.signTransfer({
  destinationPublicKey: "cd".repeat(32),
  amount: BigInt(1_000_000),
  tick: tick + 10,
});

const base64Tx = Buffer.from(signed.bytes).toString("base64");
await client.broadcastTransaction({ encodedTransaction: base64Tx });
```

Need multiple deterministic accounts from the same seed? Pass `accountIndex`:

```ts
const wallet0 = await deriveWalletFromSeed(seed);
const wallet1 = await deriveWalletFromSeed(seed, { accountIndex: 1 });
```

## Examples & CLI helpers

- `bun run example:boot` – prints the recommended boot flag/mode/epoch using `BootManager`.
- `bun run example:watch SUZ...` – streams balance changes for a Qubic identity using `QubicNodeClient.watchWallet`. Set `QUBIC_ID` if you prefer environment variables.
- `bun run example:send <seed> <dst> <amount> [--broadcast]` – derives keys from the seed, signs the transfer, and optionally broadcasts it over the public HTTP API. The destination can be either a 32-byte hex public key or the 60-letter identity.
- `bun run example:proposals` – demonstrates `ProposalCoordinator` with an in-memory proposal source.
- `bun run example:automation --profile=mainnet` – launches the headless automation runner backed by the profile-aware pipeline (use `QUBIC_AUTOMATION_IDENTITIES=ID1,ID2` to feed watchers and snapshots).
- `bun run example:dashboard --identities=SUZ...` – renders a live console dashboard (plus Prometheus metrics) for ticks and balances.

## Automation Pipelines

When you want a zero-boilerplate operations loop, use the runtime helper that wires profiles, watchers, and proposal polling in one call:

```ts
import { createAutomationRuntime } from "@qubickit/core";

const runtime = createAutomationRuntime("mainnet", {
  onBalanceSnapshot: (snapshots) => console.log("balances", snapshots.length),
  onProposals: (result) => console.log("epoch", result.epoch, "active", result.activeIndices.length),
  onBalanceChange: ({ identity, current }) => console.log("watcher", identity, current.balance),
});

await runtime.start();
// Later…
await runtime.stop();
```

Need more control? Compose your own pipeline and queue:

```ts
import { AutomationPipeline, createBalanceSnapshotJob, TransactionQueue } from "@qubickit/core";

const pipeline = new AutomationPipeline();
pipeline.addTask({
  name: "balances",
  intervalMs: 60_000,
  runOnStart: true,
  job: createBalanceSnapshotJob({
    identities: ["SUZ..."],
    fetchBalance: (identity) => client.getBalance(identity),
    onSnapshot: (snapshots) => console.log("balances", snapshots),
  }),
});
await pipeline.start();

const queue = new TransactionQueue({ wallet, client });
queue.addDispatchListener(({ item, attempt }) => console.log("dispatch", item.metadata, attempt));
queue.addRetryListener(({ item, attempt }) => console.warn("retry", item.metadata, attempt));
queue.enqueue({
  destinationPublicKey: "CD".repeat(16),
  amount: BigInt(1_000_000),
  metadata: { batch: "airdrop-042" },
});
```

## Monitoring & Telemetry

Poll tick metadata and balances to feed dashboards or alerts:

```ts
import { BalanceMonitor, TickMonitor } from "@qubickit/core";

const tickMonitor = new TickMonitor({ client: liveServiceClient, intervalMs: 2000 });
tickMonitor.on("sample", (sample) => {
  console.log(`[tick] #${sample.tick} (Δ${sample.deltaTick})`);
});
tickMonitor.start();

const balanceMonitor = new BalanceMonitor({
  client: liveServiceClient,
  identities: ["SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK"],
  intervalMs: 5000,
});
balanceMonitor.on("sample", ({ identity, balance, delta }) => {
  console.log(`[balance] ${identity} = ${balance.toString()} (Δ ${delta.toString()})`);
});
balanceMonitor.start();

// Optionally expose Prometheus metrics
const registry = new TelemetryMetricsRegistry();
tickMonitor.addSampleListener((sample) => registry.recordTick(sample));
balanceMonitor.addSampleListener((sample) => registry.recordBalance(sample));
const server = new PrometheusMetricsServer({ registry, port: 9400 });
await server.start();
```

Record latency/error metrics using the instrumentation helper:

```ts
import { instrumentRequest, TelemetryMetricsRegistry } from "@qubickit/core";

const registry = new TelemetryMetricsRegistry();
const balance = await instrumentRequest(
  () => liveServiceClient.getBalance("SUZ..."),
  { name: "live.getBalance", registry },
);
console.log(balance.balance.balance);
```

Want a quick terminal dashboard? Run `bun run example:dashboard --identities=SUZ...,ABC...` to stream tick + balance summaries while serving Prometheus metrics on `:9400/metrics`.

## Interop & Packaging

- **gRPC live service** – `LiveServiceGrpcClient` (powered by `proto/qubic/live_service.proto`) talks directly to `QubicLiveService`. Point it at `api.qubic.org:8004` (or your node) to fetch ticks, balances, or broadcast transactions via gRPC.
- **Browser bundles** – run `bun build src/index.ts --target browser --outdir dist/browser --external:@grpc/grpc-js --external:@grpc/proto-loader` to ship a tree-shaken ESM bundle that omits Node-only modules.
- **Cross-runtime embedding** – build a Node-targeted bundle (`bun build src/index.ts --target node --outdir dist/node`) and load it via `node-ffi`, `napi-rs`, or WASM runtimes to share serialization/wallet logic with Rust, Python, etc. See `docs/interop.md` for details.

## Advanced Wallet Tooling

Derive deterministic accounts via path notation:

```ts
import { deriveWalletFromPath } from "@qubickit/core";

const wallet5 = await deriveWalletFromPath(seed, "m/5");
const treasury = await deriveWalletFromPath(seed, "m/0/0'");
```

Encrypt seeds for at-rest storage:

```ts
import { encryptSecret, decryptSecret } from "@qubickit/core";

const encrypted = encryptSecret(seed, process.env.WALLET_PASS!);
const decrypted = decryptSecret(encrypted, process.env.WALLET_PASS!);
```

Build unsigned bundles for offline signing:

```ts
import { createOfflineTransferBundle, signOfflineTransferBundle } from "@qubickit/core";

const bundle = createOfflineTransferBundle({
  sourcePublicKey: wallet.publicKey,
  destinationPublicKey: destination,
  amount: BigInt(10_000),
  tick: tick + 10,
});

const signed = await signOfflineTransferBundle(bundle, wallet.privateKey);
```

## Proposal Templates & Registry

Draft and simulate shareholder proposals using the built-in template registry:

```ts
import { createDefaultProposalRegistry } from "@qubickit/core";

const registry = createDefaultProposalRegistry();

const transferDraft = registry.build("transfer", {
  epoch: 42,
  destination: "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
  amount: BigInt(10_000),
  description: "Fund operations",
});

const preview = registry.simulate("transfer", {
  epoch: 42,
  destination: transferDraft.transferOptions?.destination ?? "",
  amount: transferDraft.transferOptions?.amount ?? BigInt(0),
});
console.log(preview?.summary);
```

Custom templates can be registered via `ProposalTemplateRegistry` to support your internal review flows.

JSON drafts can be loaded and finalized via the workflow helpers:

```ts
import {
  buildProposalFromDraft,
  createDefaultProposalRegistry,
  finalizeProposalsWithSummary,
  parseProposalDraft,
} from "@qubickit/core";

const registry = createDefaultProposalRegistry();
const draft = parseProposalDraft({
  template: "transfer",
  input: { epoch: 48, destination: "SUZ...", amount: 250_000 },
});
const { data, simulation } = buildProposalFromDraft(registry, draft, { simulate: true });
console.log("Draft summary:", simulation?.summary);

await finalizeProposalsWithSummary(coordinator, async (_proposal, ctx) => {
  console.log("Finalized proposal:", ctx.summary);
});
```

## Node Connectors

- **Peer connector**: Mirror the native network stack by exposing a `QuBicNodeConnector` that opens TCP/IPv4 sessions on port `21841`, negotiates the 96-peer topology, and implements the Request/Response message lifecycle (headers with 24-bit size/type + dejavu). This connector is the landing pad for all other services and must enforce the same 1,000ms tick cadence.
- **CLI & RPC adapter**: Wrap the existing `./qubic-cli` helpers so scripts can request the current tick, boot mode, or current proposals (`-getcurrenttick`). Provide a high-level RPC client for `GET_PLAYERS`, `BROADCAST_TRANSACTION`, and other message types.
  - Ship HTTP clients for every documented RPC (tick info, proposal listings, contract queries, peer discovery, etc.), letting environments without raw TCP access still interact with Qubic; each HTTP client mirrors the native message payloads so responses map cleanly to the encoder layer.
  - Base those HTTP clients on the `/qubic/integration` reference: expose `GET /v1/tick-info`, `GET /v1/balances/:id`, transaction broadcasting endpoints, and any gRPC services (`GetTickInfo`, `GetBalance`, `BroadcastTransaction`, etc.) so integrators have every documented RPC surface available.
  - Include an HTTP transport layer that can reach any documented RPC (tick info, proposal listings, boot mode) so environments that cannot open raw TCP sockets still interact with Qubic semi-directly.
- **Boot mode manager**: The `BootManager` helper inspects remote epochs, persisted local state, and optional overrides to recommend the correct (`0 = seamless`, `1 = scratch`) flag and persists the final decision for future runs.
- **Tick/wrapper scheduler**: Add a scheduler that safely queues outgoing transactions and contract calls in the same tick window the native node expects, with simple retry semantics for missing peers or `dejavu` collisions.
- **Health & telemetry watcher**: Periodically surface peer counts, tick latency, and CPU/RAM hints so higher-level tooling can react if the node becomes unreachable or falls behind the expected epoch.

### RPC Reference (per `/qubic/integration`)

- **Tick info**: Support `GET https://api.qubic.org/v1/tick-info` to read the live tick height, epoch, duration, and `initialTick` so transaction scheduling remains accurate.
- **Balances**: Support `GET https://api.qubic.org/v1/balances/:id` to surface incoming/outgoing totals, last transfer ticks, and validity windows for a public key.
- **Broadcasting transactions**: Mirror the documented `/v1/transactions` or equivalent broadcast endpoints, ensuring payloads align with the `Transaction` encoder so signed bytes match what the native node expects.
- **gRPC surface**: Provide clients for `QubicLiveService` methods such as `GetTickInfo`, `GetBalance`, and `BroadcastTransaction` (e.g., host `213.170.135.5:8004`), letting services favor protobufs when available.
- **Historical & asset endpoints**: Track additional HTTP/gRPC RPCs described in the integration guide (asset management, smart contract reads, ledger histories) so `@qubickit/core` can grow beyond TCP-only connectors while remaining consistent with native semantics.

### Swagger-based RPC references

- `archive.swagger.json` (downloaded locally) documents endpoints for tick/transaction lookups (`/v1/ticks/{tickNumber}/{…}`, `/v1/transactions/{txId}`, `/v1/tx-status/{txId}`), epoch/computor listings, identity transfer histories, and health/status probes. Use these when building archive/ledger query helpers.
- `qubic-http.swagger.json` covers the primary live-service RPCs: tick info, balances by identity, broadcast transactions, block height, smart-contract queries, and asset issuance/ownership/possession endpoints. Mirror these paths in the HTTP clients so CLI consumers match the public API exactly.
- `stats-api.swagger.json` exposes `/v1/latest-stats`, `/v1/rich-list`, and issuer asset owner lookups; feed this data into dashboards that need market-level telemetry.
- `query_services.swagger.json` defines RPCs such as `/getTickData`, `/getTransactionsForIdentity`, `/getComputorListsForEpoch`, and transaction lookups by hash or tick. Implement a lightweight gRPC or HTTP proxy that forwards to these methods for fast programmatic queries.

All four JSON Swagger specs now live in the repo root for easy reference; keep them synchronized with upstream so code generation or manual client work stays in lockstep with the real integration surface.

## Wallet Management & Signing

Wallet tooling rounds out the SDK so developers can generate identities, sign transactions offline, and keep long-running services in sync with the tick-based network.

### Identity lifecycle

- **Seed → identity derivation**: Follow the `/qubic/integration` Go snippets (`types.GenerateRandomSeed()` + `types.NewWallet(seed)`) to derive the identity (address), 32-byte public key, and private key. Provide equivalent TypeScript helpers (`generateSeed()`, `deriveWallet(seed)`) with optional entropy injection for custodial systems.
- **Seed → identity derivation**: `deriveWalletFromSeed` reuses the official Qubic WASM (KangarooTwelve + FourQ keygen) so the resulting identity exactly matches the C++ node.
- **Serialization guarantees**: Ensure derived keys plug directly into the transaction encoder so signatures produced with the TS signer are byte-for-byte identical to the Go reference implementation.
- **Persistence**: Offer pluggable keystore adapters (filesystem vault, HSM/KMS, secure enclave) while keeping the default workflow simple—encrypt the seed/keypair before persisting it and expose utilities to zero buffers after use.

### Signing & broadcasting workflow

- Mirror the tx-based workflow from `/qubic/integration`: fetch `GET /v1/tick-info`, schedule the transfer `tick + N`, sign with the derived seed, broadcast via `/v1/broadcast-transaction`, then poll `/getLastProcessedTick` + `/getTransactionByHash` (from `query_services.swagger.json`) until the scheduled tick has executed.
- Ship high-level helpers (`wallet.send({ to, amount, ticksAhead })`) that wrap those calls but keep the underlying primitives exposed for exchanges that handle queuing and monitoring themselves.
- Provide deterministic JSON encodings for broadcast payloads so TypeScript and Go clients interoperate across the same API surface without reformatting signatures.

### Watching balances & history

- Integrate the HTTP clients above with dedicated wallet monitors:
  - `GET /v1/balances/{id}` → current balance + last transfer ticks (`qubic-http.swagger.json`).
  - `GET /v2/identities/{identity}/transfers` → normalized transfer history for statements (`archive.swagger.json`).
  - `GET /v1/assets/{identity}/owned` and `/v1/assets/{identity}/possessed` → asset inventory snapshots (qubic-http spec).
  - `/getTransactionsForIdentity` + `/getTransactionsForTick` → recon jobs that map executed transfers back to internal ledgers (query services spec).
- Expose a `WalletWatcher` that polls these endpoints (or streams tick data) and emits events such as `balanceChanged`, `transactionConfirmed`, and `assetUpdated` for UIs or backend consumers.

### Wallet security checklist

- Encourage offline/air-gapped signing by exporting unsigned transaction payloads and importing detached signatures before broadcasting.
- Provide lintable policies describing minimum seed entropy, allowed key-stores, and audit logging hooks so institutions can assert compliance.
- Wrap signer utilities so seeds never linger in long-lived memory: use short-lived buffers, zero them after signing, and rely on WASM-backed primitives when targeting browsers.
- Document recovery playbooks: regenerate wallets from stored seeds, verify derived addresses against the reference derivation, and cross-check with `/v1/identities/{identity}/transfer-transactions` (archive spec) to ensure recovered wallets match on-chain history.

## Encoders & Decoders for All Types

The core types and their wire formats are defined in the native code; the TypeScript library should reproduce them exactly so any contract call or transaction can be built and parsed deterministically. `@serialization/requestHeader` and `@serialization/transaction` provide byte-level encode/decode helpers that match the Qubic layout and power the Phase 2 deliverables.

- **RequestResponseHeader**
  - 3-byte big-endian size, 1-byte type, 4-byte dejavu.
  - Helpers to encode + decode the header with static assertions for maximum 24-bit payloads.
  - Utility to randomize dejavu (using platform crypto) and to mark message type constants (e.g., `24 = BROADCAST_TRANSACTION`, `31 = ENTITY_INFO`).
- **Transaction (`struct Transaction`)**
  - Fields: 32-byte `sourcePublicKey`, 32-byte `destinationPublicKey`, 8-byte `amount`, 4-byte `tick`, 2-byte `inputType`, 2-byte `inputSize`, variable payload, and 64-byte signature.
  - Validators for amount range, `inputSize`, and tick scheduling (must be within expected window).
  - Encoder/decoder should mirror native padding and signable slices so TypeScript clients can reuse `signTransaction`.
- **EntityRecord**
  - Mirror structure with public key, incoming/outgoing totals, transfer counts, and last tick references. Provide decoder helpers for response payloads to surface typed objects to the application.
- **Shareholder Proposal structures**
  - Encode/deserialize `GetShareholderProposalIndices_input/output`, `FinalizeShareholderStateVarProposals` inputs, and voting summaries as described in `doc/contracts_proposals.md`.
  - Provide helpers that page through proposals (`64` per batch) and expose accepted option/value pairs so wrappers can finalize state variables deterministically.
- **Auxiliary structures**
  - Model `Spectrum` entries, universe assets, and contract storage metadata so the TypeScript SDK can inspect ledger snapshots and debug contract states.
  - Provide typed views for CLI responses (tick info, proposal votes, entity info) to make logs easier to parse in tooling.

## Wrapper API

- **`QubicNodeClient`**
  - High-level wrapper around `LiveServiceClient` + `QueryServiceClient` with helpers for balances, transactions, wallet watchers, and proposal coordination.
  - Ideal entry point for CLI tools or apps that don’t want to manage individual HTTP clients.
- **Contract lifecycle helpers**
  - `ProposalCoordinator` offers in-memory helpers to process shareholder proposals, emulate `GetShareholderProposalIndices`, and finalize accepted state-variable proposals before persisting results.
- **Encoder helpers for custom payloads**
  - Provide typed payload builders for variable/multi-variable proposals, coin transfers, and cross-contract requests.
  - Offer fallback `Buffer`/`ArrayBuffer` views so native modules can sign payloads without copying.
- **Boot orchestration helpers**
  - Operators can instantiate a `BootManager` that calculates the required start mode (seamless vs scratch), persists `prevDigests`, and restarts connectors without manual coordination.
- **Diagnostics & debugging APIs**
  - Expose getters for tick latency, proposal backlog, and peer dejavu collisions so tools can expose metrics to Prometheus or CLI dashboards.
- **TypeScript-first experiences**
  - Provide `async`/`await` helpers, event emitters for incoming proposals/transactions, and RxJS-friendly streams for advanced tooling.

## Implementation Phases

1. **Phase 0 – Research + data modeling** ✅
   - Pull the exhaustive list of messages and structures from `/qubic/core` docs (`SEAMLESS.md`, `doc/contracts_proposals.md`, `doc/contract_*`, `benchmark_uefi` CMake files for include paths).
   - Build TS interfaces for each struct and align bit widths based on the native definitions (e.g., 24-bit header size, 64-entry proposal pagination).
2. **Phase 1 – Connectors & boot orchestration** ✅ (see `docs/phase1-notes.md`)
   - Build the HTTP connector, boot-mode decision tree (`BootManager`), and CLI/RPC adapters.
   - Automate tick scheduling to match the node’s 1,000ms clock.
3. **Phase 2 – Serialization + encoders/decoders** ✅ (see `docs/phase2-notes.md`)
   - Implement `RequestResponseHeader`, `Transaction`, `EntityRecord`, and proposal helpers with thorough tests verifying byte-level equality.
   - Expose signing interfaces that match native structures for cross-language compatibility.
4. **Phase 3 – Wrapper & proposal flow** ✅ (see `docs/phase3-notes.md`)
   - Deliver `QubicNodeClient`, proposal lifecycle helpers, and contract finalizers that call into the encoder layer.
   - Add convenience APIs for `getShareholderProposalIndices` and finalization hooks.
5. **Phase 4 – Documentation + onboarding** ✅ (see `docs/phase4-notes.md`)
   - Publish README, API docs, and quickstarts showing how to spin up connectors, encode transactions, and finalize proposals.
   - Provide diagnostics (tick telemetry, proposal watch) and sample CLI scripts that call the TypeScript wrapper.
6. **Phase 5 – Ecosystem integrations** ✅ (see `docs/phase5-notes.md`)
   - Ship CLI tools that wrap `QubicNodeClient`, testnet orchestrators that leverage the proposal lifecycle helpers, and npm scripts for contract deployment.
   - Gate performance tests that measure tick throughput and message deduplication to validate the TS layer against native expectations.

## Supporting Resources

- Native documentation: `SEAMLESS.md` for network start modes and epoch-driven guards.
- Proposal management: `doc/contracts_proposals.md` for share-holder lifecycles, voting summaries, and finalization macros.
- Build references: `benchmark_uefi/CMakeLists.txt` and `lib/platform_common` CMake files showing include paths and compiler flags to keep TypeScript structs aligned.
- Future ideas: see `docs/expansion.md` for “nice to have” enhancements (advanced wallet tooling, automation pipelines, monitoring, and more).

## Credits

- FourQ + KangarooTwelve WASM shim courtesy of [j0et0om](https://github.com/j0et0om); the bundled module makes our wallet derivation and SchnorrQ signing match the canonical Qubic implementation. Huge thanks for open-sourcing that work.

This expanded roadmap captures both the implementation phases and the supporting APIs needed to give TypeScript users a complete, deterministic experience. Once these anchors exist, higher-level kits (CLI scripts, bundlers, cross-platform runtimes) can be built on top of the same structure.
