import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { KeychainCredentialsProvider } from '../../../src/adapters/keychain-credentials.js';
import { CredentialsNotFoundError } from '../../../src/core/errors.js';

/**
 * Integration guard for the config directory, with nothing mocked: real
 * files on disk, the real provider, the real platform.
 *
 * The unit specs stub `readFromFile` and the OS-store readers, so they can
 * only prove the wiring. These cases prove the outcome a user gets — the
 * access token actually comes out of the directory they pointed at. On
 * macOS/Windows that doubles as the bypass regression test: if the OS store
 * were consulted again, the returned token would be this machine's, not the
 * fixture's.
 */
let sandbox: string;

/** Creates a config dir holding `.credentials.json` with the given body. */
function makeConfigDir(name: string, body: string): string {
  const dir = mkdtempSync(join(sandbox, name));
  writeFileSync(join(dir, '.credentials.json'), body);
  return dir;
}

function oauthBlob(token: string): string {
  return JSON.stringify({
    claudeAiOauth: { accessToken: token, expiresAt: 1, scopes: ['user'] },
  });
}

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'ailimits-cfgdir-'));
});

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env['CLAUDE_CONFIG_DIR'];
});

describe('KeychainCredentialsProvider against a real config directory', () => {
  it('returns the token written in the directory named by CLAUDE_CONFIG_DIR', async () => {
    const dir = makeConfigDir('env-', oauthBlob('token-from-env-dir'));
    process.env['CLAUDE_CONFIG_DIR'] = dir;

    const creds = await new KeychainCredentialsProvider().getCredentials();

    expect(creds.accessToken).toBe('token-from-env-dir');
    expect(creds.scopes).toEqual(['user']);
  });

  it('returns the token from the constructor dir, outranking the env var', async () => {
    const envDir = makeConfigDir('losing-', oauthBlob('token-from-env-dir'));
    const optDir = makeConfigDir('winning-', oauthBlob('token-from-option'));
    process.env['CLAUDE_CONFIG_DIR'] = envDir;

    const provider = new KeychainCredentialsProvider({ configDir: optDir });

    expect((await provider.getCredentials()).accessToken).toBe('token-from-option');
  });

  it('rejects with the resolved path when the directory holds no credentials', async () => {
    const missing = join(sandbox, 'not-created');
    const provider = new KeychainCredentialsProvider({ configDir: missing });

    await expect(provider.getCredentials()).rejects.toBeInstanceOf(
      CredentialsNotFoundError,
    );
    await expect(provider.getCredentials()).rejects.toThrow(missing);
  });

  it('rejects rather than crashing when the file has no claudeAiOauth block', async () => {
    const dir = makeConfigDir('empty-', JSON.stringify({ other: true }));
    const provider = new KeychainCredentialsProvider({ configDir: dir });

    await expect(provider.getCredentials()).rejects.toBeInstanceOf(
      CredentialsNotFoundError,
    );
  });
});
