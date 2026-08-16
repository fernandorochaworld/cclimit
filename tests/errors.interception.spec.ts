import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '../src/core/types.js';

/**
 * Ask 1 of `totest/001-custom-exceptions`: a client application must be able
 * to intercept and treat every failure using nothing but the published entry
 * point.
 *
 * These tests therefore import only `../src/index.js` (what `import
 * 'ailimits'` resolves to) and drive the *real* `AnthropicUsageProvider`
 * through a stubbed `fetch`, so a failure path that regressed to a bare
 * `Error` — or an error class dropped from the export surface — fails here.
 */
const { getCredentials } = vi.hoisted(() => ({
  getCredentials: vi.fn<() => Promise<Credentials>>(),
}));

// Only the credential store is doubled; the usage adapter stays real.
vi.mock('../src/adapters/keychain-credentials.js', () => ({
  KeychainCredentialsProvider: class {
    getCredentials = getCredentials;
  },
}));

import {
  AiLimitsError,
  AuthenticationError,
  CredentialsNotFoundError,
  ErrorCode,
  getUsage,
  NetworkError,
  UsageRequestError,
  UsageResponseError,
} from '../src/index.js';

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn<typeof fetch>();

/** Plain object rather than a real `Response` so `json()` can reject. */
function fakeResponse(init: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: init.json ?? (() => Promise.resolve({})),
  } as unknown as Response;
}

/** Returns the value `getUsage()` rejected with, failing if it resolves. */
async function interceptUsageFailure(): Promise<unknown> {
  const sentinel = Symbol('resolved');
  const caught = await getUsage().then(
    () => sentinel,
    (e: unknown) => e,
  );
  expect(caught).not.toBe(sentinel);
  return caught;
}

beforeEach(() => {
  getCredentials.mockResolvedValue({ accessToken: 'token' });
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetAllMocks();
});

describe('intercepting failures through the public entry point', () => {
  it.each([
    [
      'a rejected token',
      () =>
        fetchMock.mockResolvedValue(
          fakeResponse({ ok: false, status: 401, statusText: 'Unauthorized' }),
        ),
      AuthenticationError,
      ErrorCode.AuthenticationFailed,
    ],
    [
      'a rate-limited endpoint',
      () =>
        fetchMock.mockResolvedValue(
          fakeResponse({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
          }),
        ),
      UsageRequestError,
      ErrorCode.UsageRequestFailed,
    ],
    [
      'an unparseable body',
      () =>
        fetchMock.mockResolvedValue(
          fakeResponse({
            json: () => Promise.reject(new SyntaxError('Unexpected token <')),
          }),
        ),
      UsageResponseError,
      ErrorCode.UsageResponseInvalid,
    ],
    [
      'an unreachable host',
      () => fetchMock.mockRejectedValue(new TypeError('fetch failed')),
      NetworkError,
      ErrorCode.NetworkError,
    ],
  ] as const)(
    'surfaces %s as a typed, code-carrying error',
    async (_label, arrange, type, code) => {
      arrange();

      const error = await interceptUsageFailure();

      // Bare `Error` (or anything untyped) fails both assertions.
      expect(error).toBeInstanceOf(AiLimitsError);
      expect(error).toBeInstanceOf(type);
      expect((error as AiLimitsError).code).toBe(code);
      expect((error as AiLimitsError).message).not.toBe('');
    },
  );

  it('surfaces a missing credential store as CREDENTIALS_NOT_FOUND', async () => {
    getCredentials.mockRejectedValue(
      new CredentialsNotFoundError('Could not find Claude Code credentials.'),
    );

    const error = await interceptUsageFailure();

    expect(error).toBeInstanceOf(AiLimitsError);
    expect((error as AiLimitsError).code).toBe(ErrorCode.CredentialsNotFound);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exposes the HTTP status on an intercepted UsageRequestError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 503, statusText: 'Unavailable' }),
    );

    const error = await interceptUsageFailure();

    // The detail a client needs to decide whether retrying is worthwhile.
    expect((error as UsageRequestError).status).toBe(503);
    expect((error as UsageRequestError).statusText).toBe('Unavailable');
  });
});

describe('client-side branching on error.code', () => {
  /** How a consumer is expected to treat each failure. */
  function treat(err: unknown): string {
    if (!(err instanceof AiLimitsError)) return 'unhandled';
    switch (err.code) {
      case ErrorCode.CredentialsNotFound:
        return 'prompt-login';
      case ErrorCode.AuthenticationFailed:
        return 'refresh-token';
      case ErrorCode.UsageRequestFailed:
        return 'retry-later';
      case ErrorCode.UsageResponseInvalid:
        return 'report-bug';
      case ErrorCode.NetworkError:
        return 'offline';
    }
  }

  it('routes every error class to its own branch, never the fallback', () => {
    const routed = [
      new CredentialsNotFoundError('m'),
      new AuthenticationError('m'),
      new UsageRequestError('m', 500, 'Server Error'),
      new UsageResponseError('m'),
      new NetworkError('m'),
    ].map(treat);

    expect(routed).toEqual([
      'prompt-login',
      'refresh-token',
      'retry-later',
      'report-bug',
      'offline',
    ]);
    // A code added without a client branch would land here as undefined.
    expect(routed).not.toContain(undefined);
    expect(new Set(routed).size).toBe(Object.keys(ErrorCode).length);
  });
});
