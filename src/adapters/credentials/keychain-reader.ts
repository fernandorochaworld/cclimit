import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Credentials } from '../../core/types.js';
import { parseOauth } from './parse.js';

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = 'Claude Code-credentials';

/**
 * Reads Claude Code credentials from the macOS login Keychain via the
 * `security` CLI. Returns `null` on any non-darwin platform or when the
 * entry is missing.
 */
export async function readFromKeychain(): Promise<Credentials | null> {
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
