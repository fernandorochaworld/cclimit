import {
  AuthenticationError,
  NetworkError,
  UsageRequestError,
  UsageResponseError,
} from '../core/errors.js';
import type { Usage, UsageProvider } from '../core/types.js';

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';

/**
 * Driven adapter: fetches usage windows from the Anthropic OAuth usage
 * endpoint — the same endpoint Claude Code's own `/usage` command uses.
 *
 * Every failure path throws a typed {@link AiLimitsError} subclass so
 * callers can intercept specific conditions by `code`.
 */
export class AnthropicUsageProvider implements UsageProvider {
  async fetchUsage(accessToken: string): Promise<Usage> {
    let res: Response;
    try {
      res = await fetch(USAGE_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'anthropic-beta': 'oauth-2025-04-20',
          'anthropic-version': '2023-06-01',
          'User-Agent': 'claude-code-usage-limit',
        },
      });
    } catch (cause) {
      throw new NetworkError(
        'Could not reach the Anthropic usage endpoint. Check your ' +
          'network connection and try again.',
        { cause },
      );
    }

    if (res.status === 401) {
      throw new AuthenticationError(
        'Authentication failed (HTTP 401). Your Claude Code session token ' +
          'is invalid or expired — run `claude` to refresh it.',
      );
    }
    if (!res.ok) {
      throw new UsageRequestError(
        `Usage request failed: HTTP ${res.status} ${res.statusText}`,
        res.status,
        res.statusText,
      );
    }

    try {
      return (await res.json()) as Usage;
    } catch (cause) {
      throw new UsageResponseError(
        'The usage endpoint returned a response that could not be parsed ' +
          'as JSON.',
        { cause },
      );
    }
  }
}
