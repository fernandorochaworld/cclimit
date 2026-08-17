import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Credentials } from '../../core/types.js';
import { parseOauth } from './parse.js';

/**
 * Candidate filesystem locations for the Claude Code credentials file,
 * tried in order. `homedir()` already resolves to the right per-platform
 * profile directory (`/Users/<u>` on macOS, `/home/<u>` on Linux,
 * `C:\Users\<u>` on Windows), and `join` uses the platform separator.
 *
 * On Windows we also probe `%APPDATA%\.claude\.credentials.json`, which
 * some installs use when the profile directory is redirected.
 *
 * When a config dir is given it replaces the whole list: an explicitly
 * chosen directory must not silently fall back to another account's file.
 */
function candidatePaths(configDir?: string | null): string[] {
  if (configDir) return [join(configDir, '.credentials.json')];

  const paths = [join(homedir(), '.claude', '.credentials.json')];
  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'];
    if (appData) {
      paths.push(join(appData, '.claude', '.credentials.json'));
    }
  }
  return paths;
}

/**
 * Reads Claude Code credentials from the JSON file Claude Code writes
 * when no OS credential store is available. Returns `null` if no file
 * is found or the file does not contain an OAuth block.
 *
 * @param configDir Optional Claude config directory; when given, only
 * `<configDir>/.credentials.json` is probed.
 */
export async function readFromFile(
  configDir?: string | null,
): Promise<Credentials | null> {
  for (const path of candidatePaths(configDir)) {
    try {
      const raw = await readFile(path, 'utf8');
      const creds = parseOauth(raw);
      if (creds) return creds;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
