import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Palette } from '../../src/shared/colors.js';

/**
 * The palettes are computed at module load from `process.env` and
 * `stream.isTTY`, so every case re-imports the module with a fresh environment.
 */
type Env = { FORCE_COLOR?: string; NO_COLOR?: string; TERM?: string };

const ORIGINAL = {
  FORCE_COLOR: process.env.FORCE_COLOR,
  NO_COLOR: process.env.NO_COLOR,
  TERM: process.env.TERM,
  stdoutIsTTY: process.stdout.isTTY,
  stderrIsTTY: process.stderr.isTTY,
};

async function loadColors(
  env: Env,
  isTTY: boolean,
): Promise<{ stdoutColors: Palette; stderrColors: Palette }> {
  for (const key of ['FORCE_COLOR', 'NO_COLOR', 'TERM'] as const) {
    if (env[key] == null) delete process.env[key];
    else process.env[key] = env[key];
  }
  process.stdout.isTTY = isTTY;
  process.stderr.isTTY = isTTY;
  vi.resetModules();
  return import('../../src/shared/colors.js');
}

afterEach(() => {
  for (const key of ['FORCE_COLOR', 'NO_COLOR', 'TERM'] as const) {
    if (ORIGINAL[key] == null) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
  process.stdout.isTTY = ORIGINAL.stdoutIsTTY;
  process.stderr.isTTY = ORIGINAL.stderrIsTTY;
});

describe('colors', () => {
  it('returns the input unchanged when NO_COLOR is set and FORCE_COLOR is not', async () => {
    const { stdoutColors, stderrColors } = await loadColors({ NO_COLOR: '1' }, true);

    for (const paint of Object.values(stdoutColors)) {
      expect(paint('text')).toBe('text');
    }
    expect(stderrColors.red('text')).toBe('text');
  });

  it('wraps text in the matching ANSI codes when FORCE_COLOR=1', async () => {
    const { stdoutColors } = await loadColors({ FORCE_COLOR: '1' }, false);

    expect(stdoutColors.red('x')).toBe('\x1b[31mx\x1b[0m');
    expect(stdoutColors.yellow('x')).toBe('\x1b[33mx\x1b[0m');
    expect(stdoutColors.green('x')).toBe('\x1b[32mx\x1b[0m');
    expect(stdoutColors.cyan('x')).toBe('\x1b[36mx\x1b[0m');
    expect(stdoutColors.gray('x')).toBe('\x1b[90mx\x1b[0m');
    expect(stdoutColors.bold('x')).toBe('\x1b[1mx\x1b[0m');
  });

  it('honours FORCE_COLOR over NO_COLOR but ignores FORCE_COLOR=0', async () => {
    const forced = await loadColors({ FORCE_COLOR: '1', NO_COLOR: '1' }, false);
    expect(forced.stdoutColors.red('x')).toBe('\x1b[31mx\x1b[0m');

    const off = await loadColors({ FORCE_COLOR: '0' }, false);
    expect(off.stdoutColors.red('x')).toBe('x');
  });

  it('disables colour when TERM=dumb', async () => {
    const { stdoutColors } = await loadColors({ TERM: 'dumb' }, true);

    expect(stdoutColors.red('x')).toBe('x');
  });

  it('disables colour on a non-TTY stream', async () => {
    const { stdoutColors, stderrColors } = await loadColors({ TERM: 'xterm' }, false);

    expect(stdoutColors.red('x')).toBe('x');
    expect(stderrColors.red('x')).toBe('x');
  });

  it('enables colour on a TTY stream with no opt-out', async () => {
    const { stdoutColors, stderrColors } = await loadColors({ TERM: 'xterm' }, true);

    expect(stdoutColors.green('x')).toBe('\x1b[32mx\x1b[0m');
    expect(stderrColors.green('x')).toBe('\x1b[32mx\x1b[0m');
  });
});
