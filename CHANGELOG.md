# Changelog

2026-05-18 22:16 - Added a typed custom error hierarchy and colourised CLI output. New `core/errors.ts` defines `AiLimitsError` (base) plus `CredentialsNotFoundError`, `AuthenticationError`, `UsageRequestError`, `UsageResponseError` and `NetworkError`, each carrying a stable machine-readable `code` (`ErrorCode`) for client apps to intercept. The adapters now throw these instead of plain `Error`. Added `shared/colors.ts`, a TTY/`NO_COLOR`/`FORCE_COLOR`-aware ANSI palette: the CLI prints errors in red (with their code) and the expired-token warning in yellow, and the pretty renderer colour-codes usage bars by severity (green/yellow/red). All error types are exported from the library entry point.

2026-05-18 14:45 - Added a publishing guideline at `.docs/guidelines/publishing-to-npm.md` covering how to release the project to npm as both an importable dependency and an installable CLI (setup, pre-publish checklist, versioning, publish steps, safety notes).

2026-05-18 14:35 - Made the package usable both as a CLI and as a library dependency. Added a side-effect-free library entry point `src/index.ts` (re-exports plus a `getUsage()` convenience function); separated it from the `bin` CLI entry `cli.ts`, which now consumes the public API. Updated `package.json` (`main`/`types`/`exports`/`sideEffects`) and enabled TypeScript declaration output (`tsconfig.json`).

2026-05-18 14:00 - Converted the project from JavaScript to TypeScript and reorganised it into a hexagonal architecture: `core/` (domain types, ports, `UsageApp` use case), `adapters/` (Keychain credentials + Anthropic usage API), `presentation/` (pretty and JSON renderers) and `cli.ts` as the composition root. Added `tsconfig.json`, build/dev scripts and TypeScript dev dependencies.
