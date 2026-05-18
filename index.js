#!/usr/bin/env node
import { getCredentials } from './src/credentials.js';
import { fetchUsage } from './src/usage.js';

// Human-readable labels for the windows the endpoint can return.
const WINDOW_LABELS = {
  five_hour: '5-hour window',
  seven_day: '7-day window',
  seven_day_opus: '7-day window (Opus)',
  seven_day_sonnet: '7-day window (Sonnet)',
  seven_day_oauth_apps: '7-day window (apps)',
};

async function main() {
  const asJson = process.argv.includes('--json');

  const { accessToken, expiresAt } = await getCredentials();
  if (expiresAt && expiresAt < Date.now()) {
    console.warn('⚠  Stored token looks expired; trying anyway...\n');
  }

  const usage = await fetchUsage(accessToken);

  if (asJson) {
    console.log(JSON.stringify(usage, null, 2));
    return;
  }

  console.log('Claude Code usage limits\n');

  for (const [key, label] of Object.entries(WINDOW_LABELS)) {
    const window = usage[key];
    if (!window || window.utilization == null) continue;
    console.log(`  ${label.padEnd(22)} ${formatWindow(window)}`);
  }

  printExtraUsage(usage.extra_usage);
}

function formatWindow({ utilization, resets_at }) {
  const pct = Math.round(utilization);
  const reset = resets_at
    ? `resets ${new Date(resets_at).toLocaleString()}`
    : 'no reset scheduled';
  return `${bar(pct)} ${String(pct).padStart(3)}%  (${reset})`;
}

function bar(pct) {
  const width = 20;
  const filled = Math.round((Math.min(pct, 100) / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

function printExtraUsage(extra) {
  if (!extra?.is_enabled) return;
  const limit = extra.monthly_limit != null ? `${extra.monthly_limit} ${extra.currency || ''}`.trim() : 'n/a';
  console.log(`\n  Extra usage enabled — used ${extra.used_credits ?? 0}, limit ${limit}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
