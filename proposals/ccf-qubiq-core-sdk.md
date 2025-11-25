# CCF Proposal: QubiQ Core & SDK Stabilization

## Summary

`@qubiq/core` (v1.0) and `@qubiq/sdk` (v1.0) are complete, battle-tested TypeScript toolkits that mirror the native Qubic node, including deterministic wallets, automation pipelines, telemetry exporters, and proposal tooling. This proposal asks the CCF to fund continued maintenance of the shipped work and unlock the remaining ecosystem packages—`@qubiq/web`, a dapp starter, and a CLI—so developers can ship production integrations without replicating the C++ stack.

## Requested Transfer

- **Amount:** 35,000,000,000 QUs (≈ $29,540 USD at 1B QUs ≈ $844)
- **Destination:** `SUZFFQSCVPHYYBDCQODEMFAOKRJDDDIRJFFIWFLRDDJQRPKMJNOCSSKHXHGK`
- **Epoch:** 188
- **URL:** https://github.com/qubickit/core/blob/main/proposals/ccf-qubiq-core-sdk.md

## Workstreams & Allocation

| Workstream                  | Share | Purpose                                                                                                                                     |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Core & SDK Maintenance      | 45%   | Keep `@qubiq/core` / `@qubiq/sdk` aligned with upstream protocol changes, ship monthly releases, and maintain test/automation pipelines.    |
| Docs & Developer Experience | 25%   | Maintain the docs site (core.qubickit.dev), author deep-dive guides, and publish reference integrations for existing modules.               |
| New Tooling (post-funding)  | 30%   | Deliver `@qubiq/web`, `@qubiq/dapp-starter`, and `@qubiq/cli` so teams can build dashboards or automation without scaffolding from scratch. |

## Status & Milestones

| Milestone                            | Status       | Notes                                                                                                            |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Core v1.0                            | Delivered    | Deterministic wallets, Watcher, automation runtime, telemetry stack, proposal tooling, proto coverage, CI/tests. |
| SDK v1.0                             | Delivered    | High-level wallet helpers, transfer builder, contract toolkit, proposal toolkit, config loader, automation bus.  |
| Docs relaunch                        | Delivered    | Next.js/Fumadocs site with module guides, SDK docs, governance/automation playbooks.                             |
| Web components (`@qubiq/web`)        | Funded scope | React hooks/components for dashboards, proposal views, tick/balance widgets.                                     |
| CLI (`@qubiq/cli`)                   | Funded scope | Bun-based automation CLI for wallet ops, proposal submission, telemetry checks.                                  |
| Dapp starter (`@qubiq/dapp-starter`) | Funded scope | Next.js starter + config templates to bootstrap new integrations in minutes.                                     |

### Post-funding Deliverables

| Deliverable             | Description                                                                                                | Success Metric                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Monthly Release Cadence | Tagged updates for `@qubiq/core` + `@qubiq/sdk` including changelogs and smoke-test reports.               | ≥1 stable release/month with release notes.                 |
| `@qubiq/web` Components | Publish reusable React primitives (balance tables, proposal cards, telemetry charts) + Storybook docs.     | Package released + referenced in docs.                      |
| `@qubiq/dapp-starter`   | Opinionated Next.js starter using the SDK, with CI, linting, and deployment guides.                        | Repo live with instructions; used by ≥2 teams.              |
| `@qubiq/cli`            | Command-line automation: wallet derivation, proposal submission, pipeline orchestration, telemetry checks. | CLI published on npm + docs; adoption by ops teams.         |
| Docs Enhancements       | Expand guides for proposals, automation, and SDK usage (including TypeDoc integration).                    | Docs updates referenced in core.qubickit.dev release notes. |

## Team

- **Alez** – Lead developer/maintainer (core runtime, SDK, docs, automation, testing).
- **Eduard55** – QA & release verification (smoke tests, fixtures, GitHub Actions).

## Rationale

The core + SDK releases already cover all critical functionality for interacting with Qubic nodes from TypeScript runtimes. Funding ensures the team can:

1. Maintain parity with upstream protocol changes and future transports.
2. Document and support the shipped modules so integrators stay unblocked.
3. Ship the remaining high-impact packages (web components, starter kit, CLI) to broaden adoption.

With the requested budget the QubiQ toolkit becomes the go-to option for builders who need deterministic wallets, typed clients, automation, telemetry, and governance tooling without touching the C++ stack. Future ecosystem projects—`@qubiq/web`, `@qubiq/dapp-starter`, `@qubiq/cli`—will be open-sourced immediately after funding, giving the community consistent building blocks and reducing fragmentation.
