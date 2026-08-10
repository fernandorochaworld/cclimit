import { afterEach, describe, expect, it, vi } from 'vitest';
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

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

const storeCreds = { accessToken: 'store-token', expiresAt: 1 };
const fileCreds = { accessToken: 'file-token', expiresAt: 2 };

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  });
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
});
