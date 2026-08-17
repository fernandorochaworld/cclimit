import { CredentialsNotFoundError } from '../core/errors.js';
import type {
  Credentials,
  CredentialsOptions,
  CredentialsProvider,
} from '../core/types.js';
import { resolveConfigDir } from './credentials/config-dir.js';
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
 * When a config dir is supplied — via the `configDir` option or the
 * `CLAUDE_CONFIG_DIR` environment variable — only
 * `<configDir>/.credentials.json` is read; the OS stores are skipped so an
 * explicitly chosen directory cannot be overridden by a token belonging to
 * another account.
 *
 * The class name is retained for backward compatibility with v0.2.x; it
 * no longer implies the macOS Keychain exclusively.
 */
export class KeychainCredentialsProvider implements CredentialsProvider {
  constructor(private readonly options: CredentialsOptions = {}) {}

  async getCredentials(): Promise<Credentials> {
    const configDir = resolveConfigDir(this.options.configDir);
    if (configDir) return this.readFromConfigDir(configDir);

    const fromStore = await this.readFromOsStore();
    if (fromStore) return fromStore;

    const fromFile = await readFromFile();
    if (fromFile) return fromFile;

    throw new CredentialsNotFoundError(
      'Could not find Claude Code credentials. Make sure Claude Code is ' +
        'installed and you are logged in (run `claude` once).',
    );
  }

  private async readFromConfigDir(configDir: string): Promise<Credentials> {
    const fromFile = await readFromFile(configDir);
    if (fromFile) return fromFile;

    throw new CredentialsNotFoundError(
      `Could not find Claude Code credentials in ${configDir}. Make sure ` +
        'the config directory holds a .credentials.json written by Claude ' +
        'Code (run `claude` once).',
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
