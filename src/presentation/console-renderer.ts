import type { Painter } from '../shared/colors.js';
import { stdoutColors as c } from '../shared/colors.js';
import type {
  ExtraUsage,
  Usage,
  UsageRenderer,
  UsageWindow,
  WindowKey,
} from '../core/types.js';

/** Human-readable labels for each window the endpoint can return. */
const WINDOW_LABELS: Record<WindowKey, string> = {
  five_hour: '5-hour window',
  seven_day: '7-day window',
  seven_day_opus: '7-day window (Opus)',
  seven_day_sonnet: '7-day window (Sonnet)',
  seven_day_oauth_apps: '7-day window (apps)',
};

const BAR_WIDTH = 20;
const LABEL_WIDTH = 22;

/** Utilization thresholds (%) at which a window is tinted yellow / red. */
const WARN_AT = 50;
const DANGER_AT = 80;

/** Driving adapter: renders the raw usage payload as pretty-printed JSON. */
export class JsonRenderer implements UsageRenderer {
  render(usage: Usage): void {
    console.log(JSON.stringify(usage, null, 2));
  }
}

/** Driving adapter: renders usage windows as labelled, colour-coded bars. */
export class PrettyRenderer implements UsageRenderer {
  render(usage: Usage): void {
    console.log(`${c.bold('Claude Code usage limits')}\n`);

    for (const key of Object.keys(WINDOW_LABELS) as WindowKey[]) {
      const window = usage[key];
      if (!window || window.utilization == null) continue;
      console.log(
        `  ${WINDOW_LABELS[key].padEnd(LABEL_WIDTH)} ${formatWindow(window)}`,
      );
    }

    this.renderExtraUsage(usage.extra_usage);
  }

  private renderExtraUsage(extra: ExtraUsage | undefined): void {
    if (!extra?.is_enabled) return;
    const limit =
      extra.monthly_limit != null
        ? `${extra.monthly_limit} ${extra.currency ?? ''}`.trim()
        : 'n/a';
    console.log(
      `\n  ${c.cyan('Extra usage enabled')} — used ${extra.used_credits ?? 0}, limit ${limit}`,
    );
  }
}

function formatWindow({ utilization, resets_at }: UsageWindow): string {
  const pct = Math.round(utilization ?? 0);
  const tint = severityColor(pct);
  const reset = resets_at
    ? `resets ${new Date(resets_at).toLocaleString()}`
    : 'no reset scheduled';
  return `${tint(bar(pct))} ${tint(`${String(pct).padStart(3)}%`)}  ${c.gray(`(${reset})`)}`;
}

/** Picks a colour by how close the window is to its limit. */
function severityColor(pct: number): Painter {
  if (pct >= DANGER_AT) return c.red;
  if (pct >= WARN_AT) return c.yellow;
  return c.green;
}

function bar(pct: number): string {
  const filled = Math.round((Math.min(pct, 100) / 100) * BAR_WIDTH);
  return `[${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}]`;
}
