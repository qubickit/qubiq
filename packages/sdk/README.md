# QubicKit SDK

`@qubiq/sdk` builds on top of `@qubiq/core` to offer higher-level orchestration helpers. The first milestone ships `createQubiQSdk`, a convenience bootstrapper that:

- wires HTTP clients (`live`, `query`, `archive`) using a single config;
- optionally derives a wallet from a seed so you can sign transfers immediately;
- exposes a `sendTransfer` helper that picks the next tick automatically and broadcasts the signed payload; and
- bootstraps the core automation runtime (balance snapshots, proposal polling, tick monitoring) with one option.

```ts
import { createQubiQSdk, encryptWalletSeed } from "@qubiq/sdk";

const sdk = await createQubiQSdk({
  walletConfig: {
    seed: process.env.QUBIQ_SEED,
    minTickOffset: 5,
    maxTickOffset: 120,
  },
  clientConfig: { liveBaseUrl: "https://api.qubic.org" },
  automation: {
    profile: "mainnet",
    autoStart: true,
    eventBus: true, // uses ConsoleAutomationEventBus
  },
});

await sdk.sendTransfer({
  destination: "SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK",
  amount: 1_000_000n,
});

// Batch send
await sdk.sendTransferBatch([
  { destination: "SUZ...1", amount: 500_000n },
  { destination: "SUZ...2", amount: 250_000n },
]);

// Prepare offline transfer (returns SignedTransfer)
const unsigned = await sdk.prepareTransfer({ destination: "SUZ...3", amount: 100_000n });
```

Use `encryptWalletSeed` / `decryptWalletSeed` to store seeds safely (AES-GCM + PBKDF2). The wallet guardrails (`minTickOffset`, `maxTickOffset`) ensure automatically generated tick offsets stay within allowed bounds.
`sdk.walletTools` exposes helpers for encrypting seeds, deriving new paths, and retrieving the plaintext seed (when available).

You can load structured config files and reuse them across environments:

```ts
import { createQubiQSdk, loadQubiQSdkConfig } from "@qubiq/sdk";

const sdk = await createQubiQSdk(await loadQubiQSdkConfig("./qubiq.config.json"));
```

Automation emits lifecycle events via the `AutomationEventBus`. Pass `eventBus: true` for console logs, or use `new WebhookAutomationEventBus({ endpoint })` to forward snapshots/ticks/proposals to any HTTP endpoint.

## Contract + proposal toolkit

`sdk.contracts` exposes typed helpers around the generated contract metadata from `@qubiq/core`. Contracts are lazily bound and can be re-used:

```ts
const ccf = sdk.contracts.use("ComputorControlledFund"); // defaults to index 8
const { decoded } = await ccf.functions.GetProposalIndices.call({
  activeProposals: true,
  prevProposalIndex: -1,
});

// Build raw payloads without making a network call
const votePayload = ccf.procedures.Vote.encode({
  voter: "SUZ...",
  proposalIndex: 42,
});
```

You can also import `createContractToolkit`, `encodeStruct`, and `decodeStruct` directly when you need custom routing or offline payload generation.

`sdk.proposals` wraps the CCF helper in `@qubiq/core`, giving you high-level access to the latest governance items:

```ts
const active = await sdk.proposals.listActive({ epoch: 190, limit: 5 });
console.log(sdk.proposals.summarize(active));
```

This layer is purposely lightweight—contracts and proposal helpers simply sit on top of the already-type safe metadata so you can plug them into CLIs, queue workers, or dashboards quickly.

## Module map

The SDK surface is modular so you can cherry-pick the layers you need:

- `@qubiq/sdk/wallet` – wallet resolution, guardrails, and helpers such as `encryptWalletSeed`, `createWalletTools`, and `resolveWallet` (useful for CLIs that need access to HD derivations).
- `@qubiq/sdk/transfers` – low-level `prepareSignedTransfer`, `sendTransfer`, and batch utilities that take any `LiveServiceClient` instance; perfect for bespoke automation jobs.
- `@qubiq/sdk/contracts` – encoder/decoder utilities (`encodeStruct`, `decodeStruct`, `encodeStructPayload`) plus the runtime toolkit described above.
- `@qubiq/sdk/proposals` – the proposal toolkit powering `sdk.proposals`, exposed separately for headless workers.
- `@qubiq/sdk/automation` – the event bus interfaces and default adapters (`ConsoleAutomationEventBus`, `WebhookAutomationEventBus`).

Every helper is exported from the package root as well, so you can do:

```ts
import {
  resolveWallet,
  prepareSignedTransfer,
  sendTransfer,
  encodeStruct,
  createContractToolkit,
} from "@qubiq/sdk";

const walletResolution = await resolveWallet({ seed: process.env.QUBIQ_SEED });
await sendTransfer(walletResolution.wallet, sdk.clients.live, {
  destination: "SUZ...",
  amount: 250_000n,
});
```

and combine the building blocks however you like.

## Configuration helpers

Describe your runtime in JSON and let the SDK instantiate everything:

```json
{
  "wallet": {
    "seed": "${ENV:QUBIQ_SEED}",
    "hdPath": "m/44'/609'/0'/0/0"
  },
  "automation": {
    "profile": "mainnet",
    "eventBus": { "type": "webhook", "endpoint": "${ENV:AUTOMATION_ENDPOINT}" }
  }
}
```

```ts
import { createQubiQSdk, loadQubiQSdkConfig } from "@qubiq/sdk";

const sdk = await createQubiQSdk(
  await loadQubiQSdkConfig("./qubiq.config.json")
);
```

`loadQubiQSdkConfig` handles `${ENV:VAR}` substitutions, merges overrides, and instantiates the correct event bus (`console` or `webhook`). Use `resolveSdkConfig` when you already have the parsed JSON but still want placeholder resolution.

See `src/index.ts` for the exported interfaces. Additional helpers (CLI bootstrapping, starter kits, contract encoders) will be layered on in future releases. Contributions are welcome—check `docs/sdk-roadmap.md` for the broader plan.
