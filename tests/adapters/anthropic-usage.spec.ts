import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicUsageProvider } from '../../src/adapters/anthropic-usage.js';
import {
  AiLimitsError,
  AuthenticationError,
  ErrorCode,
  NetworkError,
  UsageRequestError,
  UsageResponseError,
} from '../../src/core/errors.js';
import type { Usage } from '../../src/core/types.js';

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const TOKEN = 'test-token';

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn<typeof fetch>();

/**
 * Fake responses are plain objects (not real `Response` instances) so that
 * `json()` can be made to reject.
 */
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

function fetchUsage(): Promise<Usage> {
  return new AnthropicUsageProvider().fetchUsage(TOKEN);
}

/** Rejects and returns the thrown value, failing if the call resolves. */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  const sentinel = Symbol('resolved');
  const result = await promise.then(
    () => sentinel,
    (e: unknown) => e,
  );
  expect(result).not.toBe(sentinel);
  return result;
}

beforeEach(() => {
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetAllMocks();
});

describe('AnthropicUsageProvider.fetchUsage', () => {
  it('issues exactly one GET to the usage endpoint with the OAuth headers', async () => {
    fetchMock.mockResolvedValue(fakeResponse({}));

    await fetchUsage();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(USAGE_URL, {
      method: 'GET',
      // Full object comparison: adding or renaming a header fails here.
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'anthropic-beta': 'oauth-2025-04-20',
        'anthropic-version': '2023-06-01',
        'User-Agent': 'claude-code-usage-limit',
      },
    });
  });

  it('resolves to the parsed usage payload on HTTP 200', async () => {
    const payload: Usage = {
      five_hour: { utilization: 42, resets_at: '2026-08-10T18:00:00Z' },
      extra_usage: { is_enabled: false },
    };
    fetchMock.mockResolvedValue(
      fakeResponse({ status: 200, json: () => Promise.resolve(payload) }),
    );

    await expect(fetchUsage()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP 401 to AuthenticationError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 401, statusText: 'Unauthorized' }),
    );

    const error = await captureError(fetchUsage());

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as AuthenticationError).code).toBe(
      ErrorCode.AuthenticationFailed,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [500, 'Internal Server Error'],
    [429, 'Too Many Requests'],
  ])('maps HTTP %i to UsageRequestError', async (status, statusText) => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status, statusText }));

    const error = await captureError(fetchUsage());

    expect(error).toBeInstanceOf(UsageRequestError);
    const usageError = error as UsageRequestError;
    expect(usageError.code).toBe(ErrorCode.UsageRequestFailed);
    expect(usageError.status).toBe(status);
    expect(usageError.statusText).toBe(statusText);
  });

  it('maps an unparseable OK body to UsageResponseError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      }),
    );

    const error = await captureError(fetchUsage());

    expect(error).toBeInstanceOf(UsageResponseError);
    expect((error as UsageResponseError).code).toBe(
      ErrorCode.UsageResponseInvalid,
    );
  });

  it('maps a thrown fetch to NetworkError preserving the cause', async () => {
    const cause = new TypeError('fetch failed');
    fetchMock.mockRejectedValue(cause);

    const error = await captureError(fetchUsage());

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toBeInstanceOf(AiLimitsError);
    expect((error as NetworkError).code).toBe(ErrorCode.NetworkError);
    expect((error as NetworkError).cause).toBe(cause);
    expect((error as NetworkError).name).toBe('NetworkError');
    expect((error as NetworkError).message).not.toBe('');
  });

  it.each([
    [
      'AuthenticationError',
      fakeResponse({ ok: false, status: 401, statusText: 'Unauthorized' }),
    ],
    [
      'UsageRequestError',
      fakeResponse({ ok: false, status: 503, statusText: 'Unavailable' }),
    ],
    [
      'UsageResponseError',
      fakeResponse({ json: () => Promise.reject(new SyntaxError('bad')) }),
    ],
  ])('rejects with a named, non-empty %s', async (name, response) => {
    fetchMock.mockResolvedValue(response);

    const error = await captureError(fetchUsage());

    expect(error).toBeInstanceOf(AiLimitsError);
    expect((error as AiLimitsError).name).toBe(name);
    expect((error as AiLimitsError).message).not.toBe('');
  });
});
