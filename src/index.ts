/**
 * Library entry point.
 *
 * Importing this module is side-effect-free: it performs no I/O and runs
 * nothing. Use `getUsage()` for the common case, or compose the exported
 * building blocks (ports, adapters, renderers) yourself.
 */
import { AnthropicUsageProvider } from './adapters/anthropic-usage.js';
import { KeychainCredentialsProvider } from './adapters/keychain-credentials.js';
import type { Usage } from './core/types.js';

export { UsageApp } from './core/app.js';
export { AnthropicUsageProvider } from './adapters/anthropic-usage.js';
export { KeychainCredentialsProvider } from './adapters/keychain-credentials.js';
export { JsonRenderer, PrettyRenderer } from './presentation/console-renderer.js';
export {
  AiLimitsError,
  AuthenticationError,
  CredentialsNotFoundError,
  ErrorCode,
  NetworkError,
  UsageRequestError,
  UsageResponseError,
} from './core/errors.js';
export type {
  Credentials,
  CredentialsProvider,
  ExtraUsage,
  Usage,
  UsageProvider,
  UsageRenderer,
  UsageWindow,
  WindowKey,
} from './core/types.js';

/**
 * Convenience use case: read the local Claude Code credentials and return
 * the raw usage payload. Throws if credentials are missing or the request
 * fails — callers handle errors (no `process.exit`, no logging).
 */
export async function getUsage(): Promise<Usage> {
  const { accessToken } =
    await new KeychainCredentialsProvider().getCredentials();
  return new AnthropicUsageProvider().fetchUsage(accessToken);
}
