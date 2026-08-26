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
 * `CLAUDE_CONFIG_DIR` environment variable — the *same* two-step lookup
 * runs scoped to it: on macOS/Windows the OS store entry Claude Code
 * itself scopes to that directory is tried first (see
 * {@link keychainServiceName}), then `<configDir>/.credentials.json`. This
 * mirrors how Claude Code stores credentials for a non-default profile —
 * it uses the Keychain/Credential Manager there too, never a file — so
 * switching accounts only ever needs the one directory path; the OS store
 * for a *different* config dir (or the unscoped default entry) is never
 * consulted, so an explicitly chosen directory cannot be overridden by a
 * token belonging to another account.
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
    const fromStore = await this.readFromOsStore(configDir);
    if (fromStore) return fromStore;

    const fromFile = await readFromFile(configDir);
    if (fromFile) return fromFile;

    throw new CredentialsNotFoundError(
      `Could not find Claude Code credentials in ${configDir}. Make sure ` +
        'you have logged in with this config directory — run ' +
        `\`CLAUDE_CONFIG_DIR=${configDir} claude\` once — or that it ` +
        'holds a .credentials.json written by Claude Code.',
    );
  }

  private async readFromOsStore(
    configDir?: string | null,
  ): Promise<Credentials | null> {
    switch (process.platform) {
      case 'darwin':
        return readFromKeychain(configDir);
      case 'win32':
        return readFromWindowsCredentialManager(configDir);
      default:
        return null;
    }
  }
}
