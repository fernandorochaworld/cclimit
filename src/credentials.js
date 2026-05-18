import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const CREDENTIALS_FILE = join(homedir(), '.claude', '.credentials.json');

/**
 * Read the Claude Code OAuth credentials.
 *
 * On macOS they live in the login Keychain; on Linux/Windows they are stored
 * in ~/.claude/.credentials.json. We try the Keychain first, then the file.
 *
 * @returns {Promise<{accessToken: string, expiresAt?: number, scopes?: string[]}>}
 */
export async function getCredentials() {
  const fromKeychain = await readFromKeychain();
  if (fromKeychain) return fromKeychain;

  const fromFile = await readFromFile();
  if (fromFile) return fromFile;

  throw new Error(
    'Could not find Claude Code credentials. Make sure Claude Code is ' +
      'installed and you are logged in (run `claude` once).',
  );
}

async function readFromKeychain() {
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

async function readFromFile() {
  try {
    const raw = await readFile(CREDENTIALS_FILE, 'utf8');
    return parseOauth(raw);
  } catch {
    return null;
  }
}

function parseOauth(raw) {
  const oauth = JSON.parse(raw)?.claudeAiOauth;
  if (!oauth?.accessToken) return null;
  return {
    accessToken: oauth.accessToken,
    expiresAt: oauth.expiresAt,
    scopes: oauth.scopes,
  };
}
