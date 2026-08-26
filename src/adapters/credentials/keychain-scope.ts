import { createHash } from 'node:crypto';

/**
 * Base Keychain (macOS) / Credential Manager (Windows) entry name Claude
 * Code writes the default profile's OAuth credential under.
 */
export const CREDENTIALS_SERVICE_NAME = 'Claude Code-credentials';

/**
 * Derives the OS credential-store entry name Claude Code uses for a given
 * config directory.
 *
 * Claude Code never writes a `.credentials.json` file on macOS or Windows —
 * it always stores the OAuth token in the Keychain / Credential Manager,
 * scoped per `CLAUDE_CONFIG_DIR`. The default profile (no config dir set)
 * uses the bare {@link CREDENTIALS_SERVICE_NAME}; any other config
 * directory — including `~/.claude` set *explicitly* — gets
 * `Claude Code-credentials-<hash>`, where `<hash>` is the first 8 hex
 * characters of the SHA-256 digest of the config directory's resolved,
 * absolute path.
 *
 * Verified empirically against a real macOS Keychain (two independent
 * config dirs, both entries holding a valid `claudeAiOauth` payload); this
 * is not documented by Claude Code and could change between its releases.
 *
 * @param configDir Resolved config directory (already `~`-expanded), or
 * `null`/`undefined` for the default (unscoped) profile.
 */
export function keychainServiceName(configDir?: string | null): string {
  if (!configDir) return CREDENTIALS_SERVICE_NAME;
  const hash = createHash('sha256').update(configDir).digest('hex');
  return `${CREDENTIALS_SERVICE_NAME}-${hash.slice(0, 8)}`;
}
