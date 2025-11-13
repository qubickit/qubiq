# @qubickit/core Full Roadmap

This document sketches a roadmap for the TypeScript/QubicKit wrapper around the native Qubic node implementation (`/qubic/core`). The goal is to provide `@qubickit/core` users with three pillars: (1) stable node connectors, (2) encoder/decoder utilities for every core type, and (3) a friendly wrapper surface that mirrors the native lifecycle described in `SEAMLESS.md` and `doc/contracts_proposals.md`.

## Vision

A TypeScript SDK should feel like a natural extension of the C++ node: it boots a connector, performs deterministic serialization, and mirrors the epoch-driven workflow that lets operators transition across protocol versions. By staying idiomatic to TypeScript (buffers, typed interfaces, async/await), `@qubickit/core` can serve dApps, CLI tools, and cross-platform runtimes without forcing consumers to step into the bare-metal C++ stack.

## Architecture Overview

`@qubickit/core` organizes into three layers:

1. **Connector layer** – manages TCP reachability, message framing (headers + dejavu), and tick scheduling so the library stays in lockstep with the native node’s 1,000ms clock.
2. **Serialization layer** – defines every wire structure (`RequestResponseHeader`, `Transaction`, `EntityRecord`, proposal payloads) and provides `encode/decode` helpers that validate field sizes via Zod schemas while mirroring native byte layouts exactly.
3. **Wrapper layer** – bundles connectors+encoders into high-level APIs (`QuBicNodeClient`, `ProposalCoordinator`, `BootModeManager`) so users can broadcast transactions, read proposals, and trigger finalizers with minimal boilerplate.

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

The core types and their wire formats are defined in the native code; the TypeScript library should reproduce them exactly so any contract call or transaction can be built and parsed deterministically.

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

- **`QuBicNodeClient`**
  - Combines the connector + encoders into a single class that exposes high-level methods such as `broadcastTransaction`, `getCurrentTick`, `listProposals`, and `finalizeProposal`.
  - Internally handles epoch conditional logic (e.g., `if (system.epoch >= 103)` for phase transitions) so callers can concentrate on business rules.
- **Contract lifecycle helpers**
  - Wrap `CALL(FinalizeShareholderStateVarProposals, …)` and helpers that set variables in the same order the C++ macros expect.
  - Provide a `ProposalCoordinator` that fetches indices, polls voting summaries, and writes accepted state variables via `FinalizeShareholderProposalSetStateVar`.
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
3. **Phase 2 – Serialization + encoders/decoders**
   - Implement `RequestResponseHeader`, `Transaction`, `EntityRecord`, and proposal helpers with thorough tests verifying byte-level equality.
   - Expose signing interfaces that match native structures for cross-language compatibility.
4. **Phase 3 – Wrapper & proposal flow**
   - Deliver `QuBicNodeClient`, proposal lifecycle helpers, and contract finalizers that call into the encoder layer.
   - Add convenience APIs for `setShareholderProposal`, `getShareholderProposalIndices`, and finalization hooks.
5. **Phase 4 – Documentation + onboarding**
   - Publish README, API docs, and quickstarts showing how to spin up connectors, encode transactions, and finalize proposals.
   - Provide diagnostics (tick telemetry, proposal watch) and sample CLI scripts that call the TypeScript wrapper.
6. **Phase 5 – Ecosystem integrations**
   - Ship CLI tools that wrap `QuBicNodeClient`, testnet orchestrators that leverage the proposal lifecycle helpers, and npm scripts for contract deployment.
   - Gate performance tests that measure tick throughput and message deduplication to validate the TS layer against native expectations.

## Supporting Resources

- Native documentation: `SEAMLESS.md` for network start modes and epoch-driven guards.
- Proposal management: `doc/contracts_proposals.md` for share-holder lifecycles, voting summaries, and finalization macros.
- Build references: `benchmark_uefi/CMakeLists.txt` and `lib/platform_common` CMake files showing include paths and compiler flags to keep TypeScript structs aligned.

This expanded roadmap captures both the implementation phases and the supporting APIs needed to give TypeScript users a complete, deterministic experience. Once these anchors exist, higher-level kits (CLI scripts, bundlers, cross-platform runtimes) can be built on top of the same structure.
