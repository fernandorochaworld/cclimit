import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { readFromFile } from '../../../src/adapters/credentials/file-reader.js';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
vi.mock('node:os', () => ({ homedir: vi.fn() }));

const readFileMock = vi.mocked(readFile);
const originalPlatform = process.platform;
const originalAppData = process.env['APPDATA'];

const HOME = join('/home', 'tester');
const HOME_PATH = join(HOME, '.claude', '.credentials.json');

const blob = JSON.stringify({
  claudeAiOauth: { accessToken: 'file-token', expiresAt: 42, scopes: ['s'] },
});

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  vi.mocked(homedir).mockReturnValue(HOME);
});

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  });
  if (originalAppData === undefined) delete process.env['APPDATA'];
  else process.env['APPDATA'] = originalAppData;
  vi.resetAllMocks();
});

describe('readFromFile', () => {
  it('returns credentials when the home file holds a valid blob', async () => {
    setPlatform('linux');
    readFileMock.mockResolvedValue(blob as never);

    await expect(readFromFile()).resolves.toEqual({
      accessToken: 'file-token',
      expiresAt: 42,
      scopes: ['s'],
    });
    expect(readFileMock).toHaveBeenCalledWith(HOME_PATH, 'utf8');
  });

  it('falls back to %APPDATA% on win32 when the home path fails', async () => {
    setPlatform('win32');
    process.env['APPDATA'] = join('/c', 'Users', 'tester', 'AppData');
    const appDataPath = join(
      process.env['APPDATA'] as string,
      '.claude',
      '.credentials.json',
    );
    readFileMock
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(blob as never);

    await expect(readFromFile()).resolves.toEqual({
      accessToken: 'file-token',
      expiresAt: 42,
      scopes: ['s'],
    });
    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenNthCalledWith(1, HOME_PATH, 'utf8');
    expect(readFileMock).toHaveBeenNthCalledWith(2, appDataPath, 'utf8');
  });

  it('returns null when every candidate fails', async () => {
    setPlatform('win32');
    process.env['APPDATA'] = join('/c', 'AppData');
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    await expect(readFromFile()).resolves.toBeNull();
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });

  it('only probes the home path on non-win32 platforms', async () => {
    setPlatform('darwin');
    process.env['APPDATA'] = join('/c', 'AppData');
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    await expect(readFromFile()).resolves.toBeNull();
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(HOME_PATH, 'utf8');
  });

  it('only probes the home path on win32 when APPDATA is unset', async () => {
    setPlatform('win32');
    delete process.env['APPDATA'];
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    await expect(readFromFile()).resolves.toBeNull();
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(HOME_PATH, 'utf8');
  });

  it('returns null when the file parses to no OAuth block', async () => {
    setPlatform('linux');
    readFileMock.mockResolvedValue('{"other":true}' as never);

    await expect(readFromFile()).resolves.toBeNull();
  });

  it('probes only <configDir>/.credentials.json when a config dir is given', async () => {
    setPlatform('linux');
    readFileMock.mockResolvedValue(blob);

    await expect(readFromFile('/tmp/cfg')).resolves.toEqual({
      accessToken: 'file-token',
      expiresAt: 42,
      scopes: ['s'],
    });
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(
      join('/tmp/cfg', '.credentials.json'),
      'utf8',
    );
  });

  it('ignores %APPDATA% on win32 when a config dir is given', async () => {
    setPlatform('win32');
    process.env['APPDATA'] = join('/c', 'Users', 'tester', 'AppData');
    readFileMock.mockResolvedValue(blob);

    await expect(readFromFile('/tmp/cfg')).resolves.toEqual({
      accessToken: 'file-token',
      expiresAt: 42,
      scopes: ['s'],
    });
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledWith(
      join('/tmp/cfg', '.credentials.json'),
      'utf8',
    );
  });

  it('does not fall back to the defaults when the config dir file misses', async () => {
    setPlatform('win32');
    process.env['APPDATA'] = join('/c', 'AppData');
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    await expect(readFromFile('/tmp/cfg')).resolves.toBeNull();
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when the config dir file holds no OAuth block', async () => {
    setPlatform('linux');
    readFileMock.mockResolvedValue('{"other":true}');

    await expect(readFromFile('/tmp/cfg')).resolves.toBeNull();
  });

  it('uses the default candidates when the config dir is null or undefined', async () => {
    setPlatform('linux');
    readFileMock.mockResolvedValue(blob);

    await expect(readFromFile(null)).resolves.toEqual({
      accessToken: 'file-token',
      expiresAt: 42,
      scopes: ['s'],
    });
    expect(readFileMock).toHaveBeenCalledWith(HOME_PATH, 'utf8');
  });
});
