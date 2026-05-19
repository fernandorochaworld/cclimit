#!/usr/bin/env node
import {
  AiLimitsError,
  AnthropicUsageProvider,
  JsonRenderer,
  KeychainCredentialsProvider,
  PrettyRenderer,
  UsageApp,
  type UsageRenderer,
} from './index.js';
import { stderrColors as c } from './shared/colors.js';

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
  if (err instanceof AiLimitsError) {
    // Typed failure: surface the stable error code alongside the message.
    console.error(c.red(`${c.bold(`Error [${err.code}]`)}: ${err.message}`));
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error(c.red(`${c.bold('Error')}: ${message}`));
  }
  process.exit(1);
});
