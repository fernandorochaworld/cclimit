#!/usr/bin/env node
import {
  AnthropicUsageProvider,
  JsonRenderer,
  KeychainCredentialsProvider,
  PrettyRenderer,
  UsageApp,
  type UsageRenderer,
} from './index.js';

/** Composition root: picks an output renderer based on CLI flags. */
function selectRenderer(argv: string[]): UsageRenderer {
  return argv.includes('--json') ? new JsonRenderer() : new PrettyRenderer();
}

async function main(): Promise<void> {
  const app = new UsageApp(
    new KeychainCredentialsProvider(),
    new AnthropicUsageProvider(),
    selectRenderer(process.argv.slice(2)),
  );
  await app.run();
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
