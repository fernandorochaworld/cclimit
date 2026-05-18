import type {
  CredentialsProvider,
  UsageProvider,
  UsageRenderer,
} from './types.js';

/**
 * Application service: orchestrates the use case of reading credentials,
 * fetching usage and rendering it. Depends only on ports, never on adapters.
 */
export class UsageApp {
  constructor(
    private readonly credentials: CredentialsProvider,
    private readonly usage: UsageProvider,
    private readonly renderer: UsageRenderer,
  ) {}

  async run(): Promise<void> {
    const { accessToken, expiresAt } = await this.credentials.getCredentials();

    if (expiresAt && expiresAt < Date.now()) {
      console.warn('⚠  Stored token looks expired; trying anyway...\n');
    }

    const usage = await this.usage.fetchUsage(accessToken);
    this.renderer.render(usage);
  }
}
