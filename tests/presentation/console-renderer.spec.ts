import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usage, UsageRenderer } from '../../src/core/types.js';

/**
 * Colour is decided at module load, so the palette must be disabled *before*
 * the module under test is imported; assertions then compare plain text.
 */
let JsonRenderer: new () => UsageRenderer;
let PrettyRenderer: new () => UsageRenderer;

beforeAll(async () => {
  delete process.env.FORCE_COLOR;
  process.env.NO_COLOR = '1';
  vi.resetModules();
  const mod = await import('../../src/presentation/console-renderer.js');
  JsonRenderer = mod.JsonRenderer;
  PrettyRenderer = mod.PrettyRenderer;
});

const RESETS_AT = '2026-08-10T12:00:00.000Z';
/** Derived from `Date` so the expectation is timezone-independent. */
const RESETS_TEXT = new Date(RESETS_AT).toLocaleString();

let lines: string[];

beforeEach(() => {
  lines = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPretty(usage: Usage): string[] {
  lines = [];
  new PrettyRenderer().render(usage);
  return lines;
}

/** The window line for a single-window payload (heading is line 0). */
function windowLine(utilization: number | null, resets_at: string | null = null): string {
  return renderPretty({ five_hour: { utilization, resets_at } })[1];
}

describe('JsonRenderer', () => {
  it('logs exactly one line of pretty JSON that round-trips to the payload', () => {
    const usage: Usage = {
      five_hour: { utilization: 42.5, resets_at: RESETS_AT },
      seven_day: { utilization: null, resets_at: null },
      extra_usage: {
        is_enabled: true,
        monthly_limit: 100,
        currency: 'USD',
        used_credits: 12,
      },
    };

    new JsonRenderer().render(usage);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(JSON.stringify(usage, null, 2));
    expect(JSON.parse(lines[0])).toEqual(usage);
  });
});

describe('PrettyRenderer', () => {
  it('prints the heading first', () => {
    const out = renderPretty({ five_hour: { utilization: 10, resets_at: null } });

    expect(out[0]).toContain('Claude Code usage limits');
  });

  it('prints windows in the fixed order regardless of the payload key order', () => {
    const out = renderPretty({
      seven_day_oauth_apps: { utilization: 5, resets_at: null },
      seven_day_sonnet: { utilization: 4, resets_at: null },
      seven_day: { utilization: 2, resets_at: null },
      seven_day_opus: { utilization: 3, resets_at: null },
      five_hour: { utilization: 1, resets_at: null },
    });

    const labels = out.slice(1).map((line) => line.trim().split('  ')[0]);
    expect(labels).toEqual([
      '5-hour window',
      '7-day window',
      '7-day window (Opus)',
      '7-day window (Sonnet)',
      '7-day window (apps)',
    ]);
  });

  it('skips absent windows and windows with a null utilization', () => {
    const out = renderPretty({
      five_hour: { utilization: 10, resets_at: null },
      seven_day: { utilization: null, resets_at: RESETS_AT },
    });

    expect(out).toHaveLength(2);
    expect(out[1]).toContain('5-hour window');
    expect(out.join('\n')).not.toContain('7-day window');
  });

  describe('bar', () => {
    const glyphs = (line: string) => line.slice(line.indexOf('[') + 1, line.indexOf(']'));

    it('renders an empty bar at 0%', () => {
      const filled = glyphs(windowLine(0));
      expect(filled).toBe('░'.repeat(20));
      expect(filled).not.toContain('█');
    });

    it('renders a half bar at 50%', () => {
      expect(glyphs(windowLine(50))).toBe(`${'█'.repeat(10)}${'░'.repeat(10)}`);
    });

    it('renders a full bar at 100%', () => {
      expect(glyphs(windowLine(100))).toBe('█'.repeat(20));
    });

    it('clamps values above 100% to a full bar', () => {
      expect(glyphs(windowLine(150))).toBe('█'.repeat(20));
    });

    it('is always exactly BAR_WIDTH glyphs inside brackets', () => {
      for (const pct of [0, 1, 33, 49, 50, 80, 99, 100, 150]) {
        const line = windowLine(pct);
        expect(glyphs(line)).toHaveLength(20);
        expect(line).toContain(`[${glyphs(line)}]`);
      }
    });
  });

  describe('percentage', () => {
    it('rounds a fractional utilization', () => {
      expect(windowLine(49.6)).toContain(' 50%');
      expect(windowLine(49.4)).toContain(' 49%');
    });

    it('pads the number to three columns', () => {
      expect(windowLine(7)).toContain('   7%');
      expect(windowLine(70)).toContain('  70%');
      expect(windowLine(100)).toContain(' 100%');
    });
  });

  describe('reset time', () => {
    it('shows the localised reset timestamp when resets_at is present', () => {
      expect(windowLine(10, RESETS_AT)).toContain(`resets ${RESETS_TEXT}`);
    });

    it('shows "no reset scheduled" when resets_at is null', () => {
      const line = windowLine(10, null);
      expect(line).toContain('no reset scheduled');
      expect(line).not.toContain('resets ');
    });
  });

  describe('extra usage', () => {
    const base: Usage = { five_hour: { utilization: 10, resets_at: null } };

    it('prints nothing when extra_usage is absent', () => {
      expect(renderPretty(base).join('\n')).not.toContain('Extra usage');
    });

    it('prints nothing when extra usage is disabled', () => {
      const out = renderPretty({ ...base, extra_usage: { is_enabled: false } });
      expect(out.join('\n')).not.toContain('Extra usage');
    });

    it('prints used credits and the limit with its currency when enabled', () => {
      const out = renderPretty({
        ...base,
        extra_usage: {
          is_enabled: true,
          monthly_limit: 250,
          currency: 'USD',
          used_credits: 42,
        },
      });

      expect(out[2]).toContain('Extra usage enabled');
      expect(out[2]).toContain('used 42');
      expect(out[2]).toContain('limit 250 USD');
    });

    it('shows n/a for a null monthly limit and 0 for missing used credits', () => {
      const out = renderPretty({
        ...base,
        extra_usage: { is_enabled: true, monthly_limit: null },
      });

      expect(out[2]).toContain('used 0');
      expect(out[2]).toContain('limit n/a');
    });
  });
});
