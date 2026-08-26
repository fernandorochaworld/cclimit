import { execFile } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFromKeychain } from '../../../src/adapters/credentials/keychain-reader.js';

const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => {
  const custom = Symbol.for('nodejs.util.promisify.custom');
  const execFileFn = Object.assign(vi.fn(), { [custom]: execFileAsyncMock });
  return { execFile: execFileFn, default: { execFile: execFileFn } };
});

const originalPlatform = process.platform;

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  });
  vi.resetAllMocks();
});

describe('readFromKeychain', () => {
  it('returns null without spawning anything on non-darwin', async () => {
    setPlatform('linux');

    await expect(readFromKeychain()).resolves.toBeNull();
    expect(execFileAsyncMock).not.toHaveBeenCalled();
    expect(vi.mocked(execFile)).not.toHaveBeenCalled();
  });

  it('parses the security stdout blob on darwin', async () => {
    setPlatform('darwin');
    execFileAsyncMock.mockResolvedValue({
      stdout: JSON.stringify({
        claudeAiOauth: { accessToken: 'kc-token', expiresAt: 7 },
      }),
      stderr: '',
    });

    await expect(readFromKeychain()).resolves.toEqual({
      accessToken: 'kc-token',
      expiresAt: 7,
      scopes: undefined,
    });
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    expect(execFileAsyncMock).toHaveBeenCalledWith('security', [
      'find-generic-password',
      '-s',
      'Claude Code-credentials',
      '-w',
    ]);
    // the raw (callback) execFile is never used directly
    expect(vi.mocked(execFile)).not.toHaveBeenCalled();
  });

  it('returns null when the security call rejects', async () => {
    setPlatform('darwin');
    execFileAsyncMock.mockRejectedValue(new Error('item not found'));

    await expect(readFromKeychain()).resolves.toBeNull();
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('reads the config-dir-scoped entry when a config dir is given', async () => {
    setPlatform('darwin');
    execFileAsyncMock.mockResolvedValue({
      stdout: JSON.stringify({
        claudeAiOauth: { accessToken: 'scoped-token' },
      }),
      stderr: '',
    });

    await expect(readFromKeychain('/tmp/work-profile')).resolves.toEqual({
      accessToken: 'scoped-token',
      expiresAt: undefined,
      scopes: undefined,
    });
    expect(execFileAsyncMock).toHaveBeenCalledWith('security', [
      'find-generic-password',
      '-s',
      'Claude Code-credentials-daf0411e',
      '-w',
    ]);
  });
});
