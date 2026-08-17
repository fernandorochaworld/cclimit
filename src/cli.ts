#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AiLimitsError,
  AnthropicUsageProvider,
  JsonRenderer,
  KeychainCredentialsProvider,
  PrettyRenderer,
  UsageApp,
  type UsageRenderer,
} from './index.js';
import { stderrColors as c } from './shared/colors.js';

/** Composition root: picks an output renderer based on CLI flags. */
export function selectRenderer(argv: string[]): UsageRenderer {
  return argv.includes('--json') ? new JsonRenderer() : new PrettyRenderer();
}

/**
 * Composition root: picks the Claude Code config directory from CLI flags.
 *
 * Accepts `--config-dir <path>` and `--config-dir=<path>`; the last
 * occurrence wins. Returns `undefined` — never throws — when the flag is
 * absent, when it is the final argument, or when the next token is another
 * flag, so `--config-dir --json` does not swallow `--json`. A path that
 * legitimately starts with `--` can still be passed as `--config-dir=<path>`.
 */
export function selectConfigDir(argv: string[]): string | undefined {
  let selected: string | undefined;
  for (const [i, arg] of argv.entries()) {
    if (arg.startsWith('--config-dir=')) {
      selected = arg.slice('--config-dir='.length);
      continue;
    }
    if (arg !== '--config-dir') continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) selected = next;
  }
  return selected;
}

/** Pure mapping from a thrown value to the message printed on stderr. */
export function formatError(err: unknown): string {
  if (err instanceof AiLimitsError) {
    // Typed failure: surface the stable error code alongside the message.
    return c.red(`${c.bold(`Error [${err.code}]`)}: ${err.message}`);
  }
  const message = err instanceof Error ? err.message : String(err);
  return c.red(`${c.bold('Error')}: ${message}`);
}

/** Runs the CLI and resolves with the process exit code (0 ok, 1 failure). */
export async function run(argv: string[]): Promise<number> {
  try {
    const app = new UsageApp(
      new KeychainCredentialsProvider({ configDir: selectConfigDir(argv) }),
      new AnthropicUsageProvider(),
      selectRenderer(argv),
    );
    await app.run();
    return 0;
  } catch (err: unknown) {
    console.error(formatError(err));
    return 1;
  }
}

/** True when this module is the process entry point (not merely imported). */
function isEntryPoint(): boolean {
  const invoked = process.argv[1];
  if (!invoked) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    return realpathSync(invoked) === realpathSync(self);
  } catch {
    return invoked === self;
  }
}

if (isEntryPoint()) {
  void run(process.argv.slice(2)).then((code) => process.exit(code));
}
