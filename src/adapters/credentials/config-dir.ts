import { homedir } from 'node:os';
import { join } from 'node:path';

/** Treats `undefined`, empty and whitespace-only values as unset. */
function normalize(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Expands a leading `~/` or `~\` to the user's home directory.
 *
 * Environment variables reach the process unexpanded when they are set
 * from a config file or a Docker `ENV`, so the shell cannot be relied on
 * to have done this already. Any other value — including a relative path —
 * is returned unchanged.
 */
function expandHome(value: string): string {
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return join(homedir(), value.slice(2));
  }
  return value;
}

/**
 * Resolves the Claude Code config directory to read credentials from.
 *
 * Precedence: an explicit value (a programmatic option or a CLI flag) →
 * the `CLAUDE_CONFIG_DIR` environment variable that Claude Code itself
 * honours → `null`, meaning "use the default locations".
 */
export function resolveConfigDir(explicit?: string): string | null {
  const chosen =
    normalize(explicit) ?? normalize(process.env['CLAUDE_CONFIG_DIR']);
  return chosen === null ? null : expandHome(chosen);
}
