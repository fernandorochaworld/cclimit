import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials, Usage } from '../src/core/types.js';

/**
 * Hoisted so the adapter doubles exist before `../src/index.js` is imported —
 * importing the facade must not touch the keychain or the network.
 */
const { credentialsCtor, usageCtor, getCredentials, fetchUsage } = vi.hoisted(
  () => ({
    credentialsCtor: vi.fn(),
    usageCtor: vi.fn(),
    getCredentials: vi.fn<() => Promise<Credentials>>(),
    fetchUsage: vi.fn<(token: string) => Promise<Usage>>(),
  }),
);

vi.mock('../src/adapters/keychain-credentials.js', () => ({
  KeychainCredentialsProvider: class {
    constructor() {
      credentialsCtor();
    }
    getCredentials = getCredentials;
  },
}));

vi.mock('../src/adapters/anthropic-usage.js', () => ({
  AnthropicUsageProvider: class {
    constructor() {
      usageCtor();
    }
    fetchUsage = fetchUsage;
  },
}));

import * as lib from '../src/index.js';

/**
 * Captured at load time: `afterEach` clears the mocks, so the import-time
 * counts have to be frozen here to stay meaningful.
 */
const callsAfterImport = {
  credentialsCtor: credentialsCtor.mock.calls.length,
  usageCtor: usageCtor.mock.calls.length,
  getCredentials: getCredentials.mock.calls.length,
  fetchUsage: fetchUsage.mock.calls.length,
};

const USAGE: Usage = {
  five_hour: { utilization: 42, resets_at: '2026-08-10T00:00:00Z' },
};

let errorSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  getCredentials.mockResolvedValue({ accessToken: 'token' });
  fetchUsage.mockResolvedValue(USAGE);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('getUsage', () => {
  it('returns the payload from the usage provider', async () => {
    await expect(lib.getUsage()).resolves.toBe(USAGE);
  });

  it('passes the token from the credentials provider to fetchUsage', async () => {
    getCredentials.mockResolvedValue({ accessToken: 'secret-token' });

    await lib.getUsage();

    expect(fetchUsage).toHaveBeenCalledTimes(1);
    expect(fetchUsage).toHaveBeenCalledWith('secret-token');
  });

  it('propagates a credentials failure without logging or exiting', async () => {
    const boom = new Error('no credentials');
    getCredentials.mockRejectedValue(boom);

    await expect(lib.getUsage()).rejects.toBe(boom);

    expect(fetchUsage).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('propagates a usage failure without logging or exiting', async () => {
    const boom = new Error('request failed');
    fetchUsage.mockRejectedValue(boom);

    await expect(lib.getUsage()).rejects.toBe(boom);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('public surface', () => {
  it('exports every documented building block', () => {
    for (const name of [
      'UsageApp',
      'AnthropicUsageProvider',
      'KeychainCredentialsProvider',
      'PrettyRenderer',
      'JsonRenderer',
      'getUsage',
      'ErrorCode',
      'AiLimitsError',
      'AuthenticationError',
      'CredentialsNotFoundError',
      'NetworkError',
      'UsageRequestError',
      'UsageResponseError',
    ] as const) {
      expect(lib[name], name).toBeDefined();
    }
  });

  it('is side-effect-free on import', () => {
    expect(callsAfterImport).toEqual({
      credentialsCtor: 0,
      usageCtor: 0,
      getCredentials: 0,
      fetchUsage: 0,
    });
  });
});
