import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CredentialsProvider,
  Usage,
  UsageProvider,
  UsageRenderer,
} from '../../src/core/types.js';

/**
 * Ask 2 of `totest/001-custom-exceptions`: errors print red, warnings yellow,
 * and *no* error or warning path prints uncoloured.
 *
 * `tests/shared/colors.spec.ts` covers the palette in isolation; this file
 * covers the two things that outlive it — that the real stderr sinks are
 * actually painted, and that no new unpainted sink has been introduced.
 *
 * The palettes are frozen at module load from `process.env`, so every case
 * re-imports the module graph with the environment already in place.
 */
const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url));

const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_BOLD = '\x1b[1m';

type Env = { FORCE_COLOR?: string; NO_COLOR?: string };

const ORIGINAL = {
  FORCE_COLOR: process.env.FORCE_COLOR,
  NO_COLOR: process.env.NO_COLOR,
};

function applyEnv(env: Env): void {
  for (const key of ['FORCE_COLOR', 'NO_COLOR'] as const) {
    if (env[key] == null) delete process.env[key];
    else process.env[key] = env[key];
  }
}

/**
 * Loads the CLI and the error classes from one fresh module graph — taking
 * the errors from a stale graph would break the `instanceof` narrowing that
 * `formatError` relies on.
 */
async function loadCli(env: Env) {
  applyEnv(env);
  vi.resetModules();
  const [cli, errors] = await Promise.all([
    import('../../src/cli.js'),
    import('../../src/core/errors.js'),
  ]);
  return { ...cli, ...errors };
}

/** Runs the app with an already-expired token and returns what it warned. */
async function warnOnExpiredToken(env: Env): Promise<string> {
  applyEnv(env);
  vi.resetModules();
  const { UsageApp } = await import('../../src/core/app.js');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  const credentials: CredentialsProvider = {
    getCredentials: () => Promise.resolve({ accessToken: 't', expiresAt: 1 }),
  };
  const usage: UsageProvider = {
    fetchUsage: (): Promise<Usage> =>
      Promise.resolve({ five_hour: { utilization: 1, resets_at: null } }),
  };
  const renderer: UsageRenderer = { render: () => {} };

  await new UsageApp(credentials, usage, renderer).run();

  expect(warn).toHaveBeenCalledTimes(1);
  return String(warn.mock.calls[0]?.[0]);
}

afterEach(() => {
  applyEnv(ORIGINAL);
  vi.restoreAllMocks();
});

describe('stderr sinks', () => {
  /** Every `console.error` / `console.warn` in `src/`, counted per file. */
  function sinksByFile(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of readdirSync(SRC_DIR, { recursive: true })) {
      const rel = String(entry);
      if (!rel.endsWith('.ts')) continue;
      const source = readFileSync(join(SRC_DIR, rel), 'utf8');
      const hits = source.match(/console\.(?:error|warn)\s*\(/g);
      if (hits) counts[`src/${rel.split(sep).join('/')}`] = hits.length;
    }
    return counts;
  }

  it('has no error or warning sink beyond the two coloured ones', () => {
    // A new sink must be added here *and* painted by the cases below.
    expect(sinksByFile()).toEqual({
      'src/cli.ts': 1,
      'src/core/app.ts': 1,
    });
  });
});

describe('coloured stderr output', () => {
  it('prints a typed error in red with a bold code when colour is on', async () => {
    const { formatError, CredentialsNotFoundError } = await loadCli({
      FORCE_COLOR: '1',
    });

    const out = formatError(new CredentialsNotFoundError('no credentials'));

    expect(out).toContain(ANSI_RED);
    expect(out).toContain(ANSI_BOLD);
    expect(out).toContain('CREDENTIALS_NOT_FOUND');
  });

  it('prints an untyped error in red too', async () => {
    const { formatError } = await loadCli({ FORCE_COLOR: '1' });

    expect(formatError(new Error('boom'))).toContain(ANSI_RED);
    expect(formatError('boom')).toContain(ANSI_RED);
  });

  it('prints the expired-token warning in yellow', async () => {
    const warned = await warnOnExpiredToken({ FORCE_COLOR: '1' });

    expect(warned).toContain(ANSI_YELLOW);
    expect(warned).not.toContain(ANSI_RED);
    expect(warned).toContain('expired');
  });
});

describe('redirected stderr output', () => {
  it('leaves the error free of escape codes when colour is off', async () => {
    const { formatError, NetworkError } = await loadCli({ NO_COLOR: '1' });

    const out = formatError(new NetworkError('offline'));

    expect(out).not.toContain('\x1b');
    expect(out).toBe('Error [NETWORK_ERROR]: offline');
  });

  it('leaves the warning free of escape codes when colour is off', async () => {
    const warned = await warnOnExpiredToken({ NO_COLOR: '1' });

    expect(warned).not.toContain('\x1b');
    expect(warned).toContain('expired');
  });
});
