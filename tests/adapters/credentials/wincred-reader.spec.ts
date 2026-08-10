import { execFile } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFromWindowsCredentialManager } from '../../../src/adapters/credentials/wincred-reader.js';

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

describe('readFromWindowsCredentialManager', () => {
  it('returns null without spawning anything on non-win32', async () => {
    setPlatform('darwin');

    await expect(readFromWindowsCredentialManager()).resolves.toBeNull();
    expect(execFileAsyncMock).not.toHaveBeenCalled();
    expect(vi.mocked(execFile)).not.toHaveBeenCalled();
  });

  it('invokes powershell.exe with an encoded command and parses stdout', async () => {
    setPlatform('win32');
    execFileAsyncMock.mockResolvedValue({
      stdout: JSON.stringify({
        claudeAiOauth: { accessToken: 'win-token', scopes: ['user:profile'] },
      }),
      stderr: '',
    });

    await expect(readFromWindowsCredentialManager()).resolves.toEqual({
      accessToken: 'win-token',
      expiresAt: undefined,
      scopes: ['user:profile'],
    });

    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    const [command, args] = execFileAsyncMock.mock.calls[0] as [
      string,
      string[],
    ];
    expect(command).toBe('powershell.exe');
    expect(args).toContain('-NoProfile');
    expect(args).toContain('-NonInteractive');

    const encodedIndex = args.indexOf('-EncodedCommand');
    expect(encodedIndex).toBeGreaterThanOrEqual(0);
    const script = Buffer.from(
      args[encodedIndex + 1] as string,
      'base64',
    ).toString('utf16le');
    expect(script).toContain('Claude Code-credentials');
    expect(vi.mocked(execFile)).not.toHaveBeenCalled();
  });

  it('returns null when powershell is missing or the entry does not exist', async () => {
    setPlatform('win32');
    execFileAsyncMock.mockRejectedValue(new Error('exit 2'));

    await expect(readFromWindowsCredentialManager()).resolves.toBeNull();
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
  });
});
