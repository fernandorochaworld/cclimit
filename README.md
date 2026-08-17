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

# read credentials from a specific Claude Code config directory
npx ailimits --config-dir ~/work/.claude

npm install -g ailimits   # or install the `ailimits` command
ailimits
ailimits --json
```

## Choosing the config directory

By default the credentials are looked up in the OS store and then in
`~/.claude/.credentials.json` (`%APPDATA%\.claude\.credentials.json` on
Windows). Point the tool at a different Claude Code config directory — a
second account, a container mount, a checked-out profile — in one of two
ways. Precedence, highest first:

1. `--config-dir <path>` (CLI) or `{ configDir }` (library)
2. the `CLAUDE_CONFIG_DIR` environment variable, which Claude Code itself
   honours
3. the default location: `~/.claude` (`%APPDATA%\.claude` on Windows)

When a config directory is set by either of the first two, only
`<dir>/.credentials.json` is read — the macOS Keychain and the Windows
Credential Manager are skipped, so an explicitly chosen directory cannot be
overridden by a token belonging to another account. A leading `~/` is
expanded to your home directory.

```sh
ailimits --config-dir ~/work/.claude       # or --config-dir=~/work/.claude
CLAUDE_CONFIG_DIR=~/work/.claude ailimits  # same, via the environment
```

```ts
import { getUsage } from 'ailimits';

const usage = await getUsage({ configDir: '~/work/.claude' });
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
npm run lint           # type-aware ESLint over src/ and tests/
npm run lint:fix       # same, auto-fixing what is fixable
npm test               # run the Vitest suite once
```

The same flows are available through `make`, which is the recommended entry
point:

```sh
make help              # list every available target
make build             # compile src/ → dist/
make run               # build, then run the CLI (make run-json for --json)
make start             # run the already-built CLI without recompiling
make lint              # type-aware ESLint (make lint-fix to auto-fix)
make publish-check     # rehearse an npm publish without uploading
make version-patch     # bump the patch version and tag it
```

Targets live in `make/*.mk`, one file per concern, and are included
automatically.

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
