import type { Usage, UsageProvider } from '../core/types.js';

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';

/**
 * Driven adapter: fetches usage windows from the Anthropic OAuth usage
 * endpoint — the same endpoint Claude Code's own `/usage` command uses.
 */
export class AnthropicUsageProvider implements UsageProvider {
  async fetchUsage(accessToken: string): Promise<Usage> {
    const res = await fetch(USAGE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'anthropic-beta': 'oauth-2025-04-20',
        'anthropic-version': '2023-06-01',
        'User-Agent': 'claude-code-usage-limit',
      },
    });

    if (res.status === 401) {
      throw new Error(
        'Authentication failed (401). Your Claude Code session token is ' +
          'invalid or expired — run `claude` to refresh it.',
      );
    }
    if (!res.ok) {
      throw new Error(
        `Usage request failed: HTTP ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as Usage;
  }
}
