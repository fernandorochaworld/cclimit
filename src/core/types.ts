/**
 * Domain types and ports for the Claude Code usage CLI.
 *
 * Ports (interfaces) are owned by the core; adapters in ./adapters and
 * ./presentation implement them, keeping the core free of I/O concerns.
 */

/** A single rate-limit window returned by the usage endpoint. */
export interface UsageWindow {
  utilization: number | null;
  resets_at: string | null;
}

/** Pay-as-you-go "extra usage" block. */
export interface ExtraUsage {
  is_enabled: boolean;
  monthly_limit?: number | null;
  currency?: string | null;
  used_credits?: number | null;
}

/** Keys of the rate-limit windows the endpoint can return. */
export type WindowKey =
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_opus'
  | 'seven_day_sonnet'
  | 'seven_day_oauth_apps';

/** Raw usage payload, keyed by window. */
export type Usage = Partial<Record<WindowKey, UsageWindow>> & {
  extra_usage?: ExtraUsage;
};

/** OAuth credentials for the Claude Code account. */
export interface Credentials {
  accessToken: string;
  expiresAt?: number;
  scopes?: string[];
}

/** Options controlling where Claude Code credentials are read from. */
export interface CredentialsOptions {
  /**
   * Claude Code config directory to read credentials from — a different
   * account, a container mount, a checked-out profile. Overrides the
   * `CLAUDE_CONFIG_DIR` environment variable. Credentials are looked up
   * scoped to this directory only: the OS credential store entry Claude
   * Code itself scopes to it (macOS Keychain / Windows Credential
   * Manager), then `<configDir>/.credentials.json`. Neither the default
   * profile's OS store entry nor any other directory's file is ever
   * consulted, so switching accounts is a single-parameter change with no
   * risk of picking up another account's token.
   */
  configDir?: string;
}

/** Port: a source of Claude Code OAuth credentials. */
export interface CredentialsProvider {
  getCredentials(): Promise<Credentials>;
}

/** Port: a source of usage data for a given access token. */
export interface UsageProvider {
  fetchUsage(accessToken: string): Promise<Usage>;
}

/** Port: renders a usage payload to some output. */
export interface UsageRenderer {
  render(usage: Usage): void;
}
