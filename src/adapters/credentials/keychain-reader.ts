import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Credentials } from '../../core/types.js';
import { keychainServiceName } from './keychain-scope.js';
import { parseOauth } from './parse.js';

const execFileAsync = promisify(execFile);

/**
 * Reads Claude Code credentials from the macOS login Keychain via the
 * `security` CLI. Returns `null` on any non-darwin platform or when the
 * entry is missing.
 *
 * @param configDir When given, reads the Keychain entry Claude Code scopes
 * to this config directory instead of the default profile's entry — see
 * {@link keychainServiceName}.
 */
export async function readFromKeychain(
  configDir?: string | null,
): Promise<Credentials | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s',
      keychainServiceName(configDir),
      '-w',
    ]);
    return parseOauth(stdout);
  } catch {
    return null;
  }
}
