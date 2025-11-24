# NexaKit Monorepo

This repository hosts every first-party package in the NexaKit toolkit:

| Package | Name | Location | Description |
| ------- | ---- | -------- | ----------- |
| Core | `@nexakit/core` | `packages/core` | TypeScript runtime that mirrors the Qubic node lifecycle (wallets, connectors, serialization, automation, telemetry, proposals). |
| SDK | `@nexakit/sdk` | `packages/sdk` | High-level helpers, CLIs, and starter kits that build on the core primitives (work in progress). |
| Web | `@nexakit/web` | `packages/web` | Next.js/Fumadocs documentation site deployed to https://core.nexakit.dev. |

Each workspace has its own `package.json` and scripts. The core package contains all source code that previously lived at the repo root; see `packages/core/README.md` for usage docs and examples.

## Getting started

```bash
bun install
```

Common tasks:

```bash
# Core package helpers
bun run lint          # runs packages/core lint
bun run test          # runs packages/core test
bun run build         # builds packages/core for node + browser

# Docs site
bun run dev:web       # starts packages/web in dev mode
bun run build:web     # builds packages/web for production
```

You can also run package scripts manually, e.g. `bun run --cwd packages/core example:watch`.

## Folder overview

| Path | Purpose |
| ---- | ------- |
| `packages/core` | Source, tests, examples, scripts, and proto files for `@nexakit/core`. |
| `packages/sdk` | Placeholder for upcoming high-level tooling built on the core package. |
| `packages/web` | Next.js/Fumadocs app that powers https://core.nexakit.dev. |
| `docs/`, `audit/` | Planning notes, release readiness checklists, and governance docs shared across packages. |

## Contributing

1. Fork and clone the repo.
2. Install dependencies with `bun install` (workspace-aware).
3. Make your changes inside the relevant package (`packages/core`, `packages/sdk`, or `packages/web`).
4. Run that package’s lint/test scripts.
5. Open a PR summarizing the changes and linking any docs updates.

Questions or ideas? Feel free to open an issue or ping `alez` on Discord.
