# QubiQ Monorepo

This repository hosts every first-party package in the QubiQ toolkit:

| Package | Name | Location | Description |
| ------- | ---- | -------- | ----------- |
| Core | `@qubiq/core` | `packages/core` | TypeScript runtime that mirrors the Qubic node lifecycle (wallets, connectors, serialization, automation, telemetry, proposals). |
| SDK | `@qubiq/sdk` | `packages/sdk` | High-level helpers, CLIs, and starter kits that build on the core primitives (work in progress). |
| Docs app | `@qubiq/docs` | `apps/docs` | Next.js/Fumadocs documentation site deployed to https://core.qubiq.dev. |
| Web UI kit | `@qubiq/web` | `packages/web` | (WIP) Shared React components/hooks/utilities for downstream front-ends. |
| CLI | `@qubiq/cli` | `apps/cli` | Placeholder for the upcoming QubiQ command-line interface. |
| Next.js starter | `@qubiq/next-app` | `apps/next-app` | Placeholder for an official Next.js dApp template built on the toolkit. |

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
bun run dev:docs      # starts apps/docs in dev mode
bun run build:docs    # builds apps/docs for production
```

You can also run package scripts manually, e.g. `bun run --cwd packages/core example:watch`.

## Folder overview

| Path | Purpose |
| ---- | ------- |
| `packages/core` | Source, tests, examples, scripts, and proto files for `@qubiq/core`. |
| `packages/sdk` | Placeholder for upcoming high-level tooling built on the core package. |
| `packages/web` | Future shared web components/hooks package (currently a placeholder). |
| `apps/docs` | Next.js/Fumadocs app that powers https://core.qubiq.dev. |
| `apps/cli` | QubiQ CLI workspace (placeholder). |
| `apps/next-app` | Next.js starter workspace (placeholder). |
| `docs/`, `audit/` | Planning notes, release readiness checklists, and governance docs shared across packages. |

## Contributing

1. Fork and clone the repo.
2. Install dependencies with `bun install` (workspace-aware).
3. Make your changes inside the relevant workspace (`packages/core`, `packages/sdk`, `packages/web`, `apps/docs`, `apps/cli`, or `apps/next-app`).
4. Run that package’s lint/test scripts.
5. Open a PR summarizing the changes and linking any docs updates.

Questions or ideas? Feel free to open an issue or ping `alez` on Discord.
