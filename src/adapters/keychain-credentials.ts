import { CredentialsNotFoundError } from '../core/errors.js';
import type { Credentials, CredentialsProvider } from '../core/types.js';
import { readFromFile } from './credentials/file-reader.js';
import { readFromKeychain } from './credentials/keychain-reader.js';
import { readFromWindowsCredentialManager } from './credentials/wincred-reader.js';

/**
 * Driven adapter: reads Claude Code OAuth credentials from whichever
 * store the current platform uses.
 *
 * Resolution order:
 *   - macOS:   login Keychain ("Claude Code-credentials") → file fallback
 *   - Windows: Credential Manager ("Claude Code-credentials") → file fallback
 *   - Linux:   `~/.claude/.credentials.json`
 *
 * The class name is retained for backward compatibility with v0.2.x; it
 * no longer implies the macOS Keychain exclusively.
 */
export class KeychainCredentialsProvider implements CredentialsProvider {
  async getCredentials(): Promise<Credentials> {
    const fromStore = await this.readFromOsStore();
    if (fromStore) return fromStore;

    const fromFile = await readFromFile();
    if (fromFile) return fromFile;

    throw new CredentialsNotFoundError(
      'Could not find Claude Code credentials. Make sure Claude Code is ' +
        'installed and you are logged in (run `claude` once).',
    );
  }

  private async readFromOsStore(): Promise<Credentials | null> {
    switch (process.platform) {
      case 'darwin':
        return readFromKeychain();
      case 'win32':
        return readFromWindowsCredentialManager();
      default:
        return null;
    }
  }
}
