import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsageApp } from '../../src/core/app.js';
import type {
  CredentialsProvider,
  Usage,
  UsageProvider,
  UsageRenderer,
} from '../../src/core/types.js';

const NOW = Date.UTC(2026, 7, 10, 12, 0, 0);
const TOKEN = 'access-token-123';
const USAGE: Usage = { five_hour: { utilization: 42, resets_at: null } };

function makeApp(credentials: { accessToken: string; expiresAt?: number }) {
  const getCredentials = vi.fn<CredentialsProvider['getCredentials']>(
    async () => credentials,
  );
  const fetchUsage = vi.fn<UsageProvider['fetchUsage']>(async () => USAGE);
  const render = vi.fn<UsageRenderer['render']>();

  const app = new UsageApp(
    { getCredentials },
    { fetchUsage },
    { render },
  );

  return { app, getCredentials, fetchUsage, render };
}

describe('UsageApp', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads credentials, fetches usage with the token and renders the result', async () => {
    const { app, getCredentials, fetchUsage, render } = makeApp({
      accessToken: TOKEN,
    });

    await expect(app.run()).resolves.toBeUndefined();

    expect(getCredentials).toHaveBeenCalledTimes(1);
    expect(fetchUsage).toHaveBeenCalledTimes(1);
    expect(fetchUsage).toHaveBeenCalledWith(TOKEN);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]?.[0]).toBe(USAGE);
  });

  it('runs the ports in order: credentials → usage → render', async () => {
    const { app, getCredentials, fetchUsage, render } = makeApp({
      accessToken: TOKEN,
    });

    await app.run();

    expect(getCredentials).toHaveBeenCalledBefore(fetchUsage);
    expect(fetchUsage).toHaveBeenCalledBefore(render);
  });

  it('warns once but still fetches and renders when the token is expired', async () => {
    const { app, fetchUsage, render } = makeApp({
      accessToken: TOKEN,
      expiresAt: NOW - 1000,
    });

    await app.run();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('looks expired');
    expect(fetchUsage).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not warn when the token is still valid', async () => {
    const { app } = makeApp({ accessToken: TOKEN, expiresAt: NOW + 1000 });

    await app.run();

    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when the credentials carry no expiry', async () => {
    const { app } = makeApp({ accessToken: TOKEN });

    await app.run();

    expect(warn).not.toHaveBeenCalled();
  });

  it('propagates a credentials failure without fetching or rendering', async () => {
    const boom = new Error('no credentials');
    const { app, getCredentials, fetchUsage, render } = makeApp({
      accessToken: TOKEN,
    });
    getCredentials.mockRejectedValueOnce(boom);

    await expect(app.run()).rejects.toBe(boom);

    expect(fetchUsage).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('propagates a usage failure without rendering', async () => {
    const boom = new Error('usage down');
    const { app, fetchUsage, render } = makeApp({ accessToken: TOKEN });
    fetchUsage.mockRejectedValueOnce(boom);

    await expect(app.run()).rejects.toBe(boom);

    expect(render).not.toHaveBeenCalled();
  });
});
