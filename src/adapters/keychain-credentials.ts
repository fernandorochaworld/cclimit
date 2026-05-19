import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { CredentialsNotFoundError } from '../core/errors.js';
import type { Credentials, CredentialsProvider } from '../core/types.js';

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const CREDENTIALS_FILE = join(homedir(), '.claude', '.credentials.json');

/** Shape of the on-disk / Keychain credentials JSON. */
interface RawCredentialsFile {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
}

/**
 * Driven adapter: reads Claude Code OAuth credentials.
 *
 * On macOS the credentials live in the login Keychain; on other platforms
 * they are stored in ~/.claude/.credentials.json. The Keychain is tried
 * first, then the file.
 */
export class KeychainCredentialsProvider implements CredentialsProvider {
  async getCredentials(): Promise<Credentials> {
    const fromKeychain = await this.readFromKeychain();
    if (fromKeychain) return fromKeychain;

    const fromFile = await this.readFromFile();
    if (fromFile) return fromFile;

    throw new CredentialsNotFoundError(
      'Could not find Claude Code credentials. Make sure Claude Code is ' +
        'installed and you are logged in (run `claude` once).',
    );
  }

  private async readFromKeychain(): Promise<Credentials | null> {
    if (process.platform !== 'darwin') return null;
    try {
      const { stdout } = await execFileAsync('security', [
        'find-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-w',
      ]);
      return parseOauth(stdout);
    } catch {
      return null;
    }
  }

  private async readFromFile(): Promise<Credentials | null> {
    try {
      const raw = await readFile(CREDENTIALS_FILE, 'utf8');
      return parseOauth(raw);
    } catch {
      return null;
    }
  }
}

function parseOauth(raw: string): Credentials | null {
  const oauth = (JSON.parse(raw) as RawCredentialsFile)?.claudeAiOauth;
  if (!oauth?.accessToken) return null;
  return {
    accessToken: oauth.accessToken,
    expiresAt: oauth.expiresAt,
    scopes: oauth.scopes,
  };
}
