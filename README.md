# claude-code-usage-limit

A small TypeScript CLI that reports your current **Claude Code** subscription
usage limits — the same 5-hour and 7-day rate-limit windows shown by Claude
Code's built-in `/usage` command.

## How it works

1. Reads your Claude Code OAuth token from the macOS Keychain
   (`Claude Code-credentials`), or from `~/.claude/.credentials.json` on other
   platforms.
2. Calls `GET https://api.anthropic.com/api/oauth/usage` — the endpoint Claude
   Code itself uses — and prints the utilization of each window.

No credentials are stored or transmitted anywhere except to Anthropic's API.

## Requirements

- Node.js 20+ (uses the built-in `fetch`)
- Claude Code installed and logged in (run `claude` once)

## Usage

```sh
npm install            # install dev dependencies (TypeScript)
npm run build          # compile src/ → dist/
npm start              # pretty output
node dist/cli.js --json  # raw JSON from the API
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
- `cli.ts` — the composition root: wires adapters into `UsageApp`.

Example output:

```
Claude Code usage limits

  5-hour window          [██░░░░░░░░░░░░░░░░░░]   8%  (resets 5/18/2026, 8:20:00 PM)
  7-day window           [██░░░░░░░░░░░░░░░░░░]  12%  (resets 5/22/2026, 8:00:00 PM)
```
