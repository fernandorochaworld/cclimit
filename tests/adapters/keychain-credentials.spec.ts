import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFromFile } from '../../src/adapters/credentials/file-reader.js';
import { readFromKeychain } from '../../src/adapters/credentials/keychain-reader.js';
import { readFromWindowsCredentialManager } from '../../src/adapters/credentials/wincred-reader.js';
import { KeychainCredentialsProvider } from '../../src/adapters/keychain-credentials.js';
import { CredentialsNotFoundError, ErrorCode } from '../../src/core/errors.js';

vi.mock('../../src/adapters/credentials/file-reader.js', () => ({
  readFromFile: vi.fn(),
}));
vi.mock('../../src/adapters/credentials/keychain-reader.js', () => ({
  readFromKeychain: vi.fn(),
}));
vi.mock('../../src/adapters/credentials/wincred-reader.js', () => ({
  readFromWindowsCredentialManager: vi.fn(),
}));

const fileReader = vi.mocked(readFromFile);
const keychainReader = vi.mocked(readFromKeychain);
const wincredReader = vi.mocked(readFromWindowsCredentialManager);

const originalPlatform = process.platform;
const originalConfigDir = process.env['CLAUDE_CONFIG_DIR'];

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

const storeCreds = { accessToken: 'store-token', expiresAt: 1 };
const fileCreds = { accessToken: 'file-token', expiresAt: 2 };

beforeEach(() => {
  delete process.env['CLAUDE_CONFIG_DIR'];
});

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  });
  if (originalConfigDir === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
  else process.env['CLAUDE_CONFIG_DIR'] = originalConfigDir;
  vi.resetAllMocks();
});

describe('KeychainCredentialsProvider', () => {
  it('prefers the Keychain on darwin and never reads the file', async () => {
    setPlatform('darwin');
    keychainReader.mockResolvedValue(storeCreds);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(storeCreds);
    expect(fileReader).not.toHaveBeenCalled();
    expect(wincredReader).not.toHaveBeenCalled();
  });

  it('falls back to the file when the darwin Keychain misses', async () => {
    setPlatform('darwin');
    keychainReader.mockResolvedValue(null);
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(keychainReader).toHaveBeenCalledTimes(1);
    expect(fileReader).toHaveBeenCalledTimes(1);
  });

  it('falls back to the file when the Windows store misses', async () => {
    setPlatform('win32');
    wincredReader.mockResolvedValue(null);
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(wincredReader).toHaveBeenCalledTimes(1);
    expect(keychainReader).not.toHaveBeenCalled();
  });

  it('uses only the file reader on linux', async () => {
    setPlatform('linux');
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(keychainReader).not.toHaveBeenCalled();
    expect(wincredReader).not.toHaveBeenCalled();
  });

  it('rejects with CredentialsNotFoundError when store and file miss', async () => {
    setPlatform('darwin');
    keychainReader.mockResolvedValue(null);
    fileReader.mockResolvedValue(null);

    const error = await new KeychainCredentialsProvider()
      .getCredentials()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CredentialsNotFoundError);
    expect((error as CredentialsNotFoundError).code).toBe(
      ErrorCode.CredentialsNotFound,
    );
  });

  it('returns expired credentials unchanged — expiry is not its concern', async () => {
    setPlatform('darwin');
    const expired = { accessToken: 'stale', expiresAt: Date.now() - 60_000 };
    keychainReader.mockResolvedValue(expired);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(expired);
  });

  it('bypasses the Keychain on darwin when a config dir is given', async () => {
    setPlatform('darwin');
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider({
        configDir: '/tmp/cfg',
      }).getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(keychainReader).toHaveBeenCalledTimes(0);
    expect(fileReader).toHaveBeenCalledTimes(1);
    expect(fileReader).toHaveBeenCalledWith('/tmp/cfg');
  });

  it('bypasses the Windows store when a config dir is given', async () => {
    setPlatform('win32');
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider({
        configDir: '/tmp/cfg',
      }).getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(wincredReader).toHaveBeenCalledTimes(0);
    expect(fileReader).toHaveBeenCalledTimes(1);
    expect(fileReader).toHaveBeenCalledWith('/tmp/cfg');
  });

  it('uses CLAUDE_CONFIG_DIR when no constructor option is given', async () => {
    setPlatform('darwin');
    process.env['CLAUDE_CONFIG_DIR'] = '/tmp/env';
    fileReader.mockResolvedValue(fileCreds);

    await expect(
      new KeychainCredentialsProvider().getCredentials(),
    ).resolves.toEqual(fileCreds);
    expect(keychainReader).toHaveBeenCalledTimes(0);
    expect(fileReader).toHaveBeenCalledWith('/tmp/env');
  });

  it('prefers the constructor option over CLAUDE_CONFIG_DIR', async () => {
    setPlatform('linux');
    process.env['CLAUDE_CONFIG_DIR'] = '/tmp/env';
    fileReader.mockResolvedValue(fileCreds);

    await new KeychainCredentialsProvider({
      configDir: '/tmp/cfg',
    }).getCredentials();

    expect(fileReader).toHaveBeenCalledWith('/tmp/cfg');
  });

  it('names the config dir in the error when it holds no credentials', async () => {
    setPlatform('darwin');
    fileReader.mockResolvedValue(null);

    const error = await new KeychainCredentialsProvider({
      configDir: '/tmp/cfg',
    })
      .getCredentials()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CredentialsNotFoundError);
    expect((error as CredentialsNotFoundError).message).toContain('/tmp/cfg');
    expect((error as CredentialsNotFoundError).code).toBe(
      ErrorCode.CredentialsNotFound,
    );
    expect(keychainReader).toHaveBeenCalledTimes(0);
  });

  it('keeps the default candidates when the config dir is blank', async () => {
    setPlatform('linux');
    fileReader.mockResolvedValue(fileCreds);

    await new KeychainCredentialsProvider({ configDir: '   ' }).getCredentials();

    expect(fileReader).toHaveBeenCalledWith();
  });
});
