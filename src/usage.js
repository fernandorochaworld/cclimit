const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';

/**
 * Fetch the current usage / rate-limit windows for a Claude Code account.
 *
 * This calls the same endpoint Claude Code's own `/usage` command uses.
 *
 * @param {string} accessToken OAuth access token from the credentials store.
 * @returns {Promise<object>} Raw usage payload keyed by window (five_hour, ...).
 */
export async function fetchUsage(accessToken) {
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
    throw new Error(`Usage request failed: HTTP ${res.status} ${res.statusText}`);
  }

  return res.json();
}
