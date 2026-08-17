import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Usage, UsageRenderer } from '../../src/core/types.js';

/**
 * Threshold colours need a colour-enabled palette, which is computed at module
 * load — hence a dedicated file that sets FORCE_COLOR before importing.
 */
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

let PrettyRenderer: new () => UsageRenderer;

beforeAll(async () => {
  delete process.env.NO_COLOR;
  process.env.FORCE_COLOR = '1';
  vi.resetModules();
  ({ PrettyRenderer } = await import('../../src/presentation/console-renderer.js'));
});

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

function colorFor(utilization: number): string {
  const usage: Usage = { five_hour: { utilization, resets_at: null } };
  lines = [];
  new PrettyRenderer().render(usage);
  const line = lines[1];
  // eslint-disable-next-line no-control-regex -- stripping ANSI needs the ESC char
  const match = /\x1b\[(3[123])m/.exec(line);
  return match ? `\x1b[${match[1]}m` : '';
}

describe('PrettyRenderer threshold colours', () => {
  it('tints below the warn threshold green', () => {
    expect(colorFor(49)).toBe(GREEN);
  });

  it('tints from the warn threshold up to the danger threshold yellow', () => {
    expect(colorFor(50)).toBe(YELLOW);
    expect(colorFor(79)).toBe(YELLOW);
  });

  it('tints from the danger threshold up red', () => {
    expect(colorFor(80)).toBe(RED);
    expect(colorFor(100)).toBe(RED);
  });
});
