# ailimits

A small TypeScript CLI that reports your current **Claude Code** subscription
usage limits — the same 5-hour and 7-day rate-limit windows shown by Claude
Code's built-in `/usage` command.

## How it works

1. Reads your Claude Code OAuth token from the OS credential store —
   macOS Keychain or Windows Credential Manager (target
   `Claude Code-credentials`) — and falls back to
   `~/.claude/.credentials.json` (also `%APPDATA%\.claude\.credentials.json`
   on Windows) when no OS store entry is present.
2. Calls `GET https://api.anthropic.com/api/oauth/usage` — the endpoint Claude
   Code itself uses — and prints the utilization of each window.

No credentials are stored or transmitted anywhere except to Anthropic's API.

## Requirements

- Node.js 20+ (uses the built-in `fetch`)
- Claude Code installed and logged in (run `claude` once)

## Use as a CLI

```sh
npx ailimits          # one-off, no install
npx ailimits --json   # raw JSON from the API

npm install -g ailimits   # or install the `ailimits` command
ailimits
ailimits --json
```

## Use as a dependency

```sh
npm install ailimits
```

```ts
import { getUsage } from 'ailimits';

// Convenience: read local credentials and return the raw usage payload.
const usage = await getUsage();
console.log(usage.five_hour?.utilization);
```

```ts
// Or compose the building blocks yourself (e.g. a custom renderer).
import {
  UsageApp,
  KeychainCredentialsProvider,
  AnthropicUsageProvider,
  PrettyRenderer,
} from 'ailimits';

await new UsageApp(
  new KeychainCredentialsProvider(),
  new AnthropicUsageProvider(),
  new PrettyRenderer(),
).run();
```

Importing the package is side-effect-free — nothing runs until you call it,
and the library throws on error instead of calling `process.exit`. The tool
only works where Claude Code credentials exist locally (e.g. a dev machine).

## Local development

```sh
npm install            # install dev dependencies (TypeScript)
npm run build          # compile src/ → dist/
npm start              # pretty output
npm run dev            # build + run in one step
```

## Architecture

The project follows a hexagonal layout under `src/`:

- `core/` — domain types, ports (interfaces) and the `UsageApp` use case.
  Contains no I/O.
- `adapters/` — driven adapters that implement the ports: reading
  credentials from the Keychain/file and fetching usage from the API.
- `presentation/` — driving adapters that render output (`PrettyRenderer`,
  `JsonRenderer`).
- `index.ts` — the library entry point: side-effect-free re-exports plus the
  `getUsage()` convenience function.
- `cli.ts` — the CLI entry point (`bin`): the composition root that wires
  adapters into `UsageApp`. Consumes the public API from `index.ts`.

Example output:

```
Claude Code usage limits

  5-hour window          [██░░░░░░░░░░░░░░░░░░]   8%  (resets 5/18/2026, 8:20:00 PM)
  7-day window           [██░░░░░░░░░░░░░░░░░░]  12%  (resets 5/22/2026, 8:00:00 PM)
```
