# Changelog

2026-05-18 14:00 - Converted the project from JavaScript to TypeScript and reorganised it into a hexagonal architecture: `core/` (domain types, ports, `UsageApp` use case), `adapters/` (Keychain credentials + Anthropic usage API), `presentation/` (pretty and JSON renderers) and `cli.ts` as the composition root. Added `tsconfig.json`, build/dev scripts and TypeScript dev dependencies.
