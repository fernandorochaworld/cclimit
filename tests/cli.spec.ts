import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatError, run, selectRenderer } from '../src/cli.js';
import {
  CredentialsNotFoundError,
  JsonRenderer,
  NetworkError,
  PrettyRenderer,
} from '../src/index.js';
import type { Credentials, Usage } from '../src/core/types.js';

/**
 * Hoisted so the guard and the adapter stubs exist before `../src/cli.js`
 * is imported — importing the module must not run anything.
 */
const { exitCalls, installExitGuard, getCredentials, fetchUsage } = vi.hoisted(
  () => {
    const calls: unknown[] = [];
    return {
      exitCalls: calls,
      installExitGuard: () =>
        vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
          calls.push(code);
          throw new Error(`process.exit(${String(code)}) was called`);
        }) as never),
      getCredentials: vi.fn<() => Promise<Credentials>>(),
      fetchUsage: vi.fn<() => Promise<Usage>>(),
    };
  },
);

installExitGuard();

vi.mock('../src/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/index.js')>();
  return {
    ...actual,
    KeychainCredentialsProvider: class {
      getCredentials = getCredentials;
    },
    AnthropicUsageProvider: class {
      fetchUsage = fetchUsage;
    },
  };
});

const USAGE: Usage = {
  five_hour: { utilization: 42, resets_at: '2026-08-10T00:00:00Z' },
};

/** Colour is TTY-dependent, so compare on the un-styled text. */
const plain = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '');

beforeEach(() => {
  getCredentials.mockResolvedValue({ accessToken: 'token' });
  fetchUsage.mockResolvedValue(USAGE);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  // `restoreAllMocks` un-installs the guard; keep it active for the next test.
  installExitGuard();
});

describe('module import', () => {
  it('has no side effects: process.exit is never called', () => {
    expect(exitCalls).toHaveLength(0);
  });
});

describe('entry-point detection', () => {
  const realArgv1 = process.argv[1];

  afterEach(() => {
    process.argv[1] = realArgv1;
    vi.resetModules();
  });

  it('runs nothing when the process was started from another file', async () => {
    process.argv[1] = fileURLToPath(new URL('../package.json', import.meta.url));
    vi.resetModules();

    await import('../src/cli.js');

    expect(getCredentials).not.toHaveBeenCalled();
    expect(exitCalls).toHaveLength(0);
  });

  it('runs nothing when the invoked path cannot be resolved', async () => {
    process.argv[1] = '/no/such/file-that-does-not-exist.js';
    vi.resetModules();

    await import('../src/cli.js');

    expect(getCredentials).not.toHaveBeenCalled();
    expect(exitCalls).toHaveLength(0);
  });

  it('runs nothing when there is no invoked path at all', async () => {
    process.argv[1] = '';
    vi.resetModules();

    await import('../src/cli.js');

    expect(getCredentials).not.toHaveBeenCalled();
    expect(exitCalls).toHaveLength(0);
  });
});

describe('selectRenderer', () => {
  it('defaults to the pretty renderer with no flags', () => {
    expect(selectRenderer([])).toBeInstanceOf(PrettyRenderer);
  });

  it('returns the JSON renderer for --json', () => {
    expect(selectRenderer(['--json'])).toBeInstanceOf(JsonRenderer);
  });

  it('returns the JSON renderer when --json appears among other args', () => {
    expect(selectRenderer(['--json', 'extra'])).toBeInstanceOf(JsonRenderer);
  });

  it('falls back to the pretty renderer for unknown flags', () => {
    expect(selectRenderer(['--nope'])).toBeInstanceOf(PrettyRenderer);
  });
});

describe('formatError', () => {
  it('surfaces the error code for a typed AiLimitsError', () => {
    const out = formatError(new CredentialsNotFoundError('m'));
    expect(out).toContain('Error [');
    expect(out).toContain('CREDENTIALS_NOT_FOUND');
    expect(out).toContain('m');
  });

  it('formats a plain Error without a code block', () => {
    const out = plain(formatError(new Error('x')));
    expect(out).toContain('Error');
    expect(out).toContain('x');
    expect(out).not.toContain('[');
  });

  it('stringifies a non-Error thrown value', () => {
    expect(formatError('boom')).toContain('boom');
  });
});

describe('run', () => {
  it('resolves 0 and renders output on the happy path', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(run([])).resolves.toBe(0);

    expect(log.mock.calls.length).toBeGreaterThan(0);
    expect(exitCalls).toHaveLength(0);
  });

  it('resolves 1 and reports the code when credentials cannot be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    getCredentials.mockRejectedValue(
      new CredentialsNotFoundError('no credentials'),
    );

    await expect(run([])).resolves.toBe(1);

    expect(fetchUsage).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('CREDENTIALS_NOT_FOUND'),
    );
    expect(exitCalls).toHaveLength(0);
  });

  it('resolves 1 and reports the code when the usage request fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchUsage.mockRejectedValue(new NetworkError('offline'));

    await expect(run([])).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('NETWORK_ERROR'),
    );
    expect(exitCalls).toHaveLength(0);
  });
});
