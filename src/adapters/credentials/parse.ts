import type { Credentials } from '../../core/types.js';

/** Shape of the on-disk / Keychain credentials JSON. */
interface RawCredentialsFile {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
}

/**
 * Parse a Claude Code credentials JSON blob into our domain type.
 *
 * Strips a leading UTF-8 BOM defensively: files written by Windows tools
 * (Notepad, some editors) sometimes prepend one, which would otherwise
 * make `JSON.parse` fail.
 */
export function parseOauth(raw: string): Credentials | null {
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const trimmed = cleaned.trim();
  if (!trimmed) return null;
  const oauth = (JSON.parse(trimmed) as RawCredentialsFile)?.claudeAiOauth;
  if (!oauth?.accessToken) return null;
  return {
    accessToken: oauth.accessToken,
    expiresAt: oauth.expiresAt,
    scopes: oauth.scopes,
  };
}
