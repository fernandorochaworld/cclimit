# Changelog

2026-05-18 14:35 - Made the package usable both as a CLI and as a library dependency. Added a side-effect-free library entry point `src/index.ts` (re-exports plus a `getUsage()` convenience function); separated it from the `bin` CLI entry `cli.ts`, which now consumes the public API. Updated `package.json` (`main`/`types`/`exports`/`sideEffects`) and enabled TypeScript declaration output (`tsconfig.json`).

2026-05-18 14:00 - Converted the project from JavaScript to TypeScript and reorganised it into a hexagonal architecture: `core/` (domain types, ports, `UsageApp` use case), `adapters/` (Keychain credentials + Anthropic usage API), `presentation/` (pretty and JSON renderers) and `cli.ts` as the composition root. Added `tsconfig.json`, build/dev scripts and TypeScript dev dependencies.
