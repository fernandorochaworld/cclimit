import { homedir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveConfigDir } from '../../../src/adapters/credentials/config-dir.js';

vi.mock('node:os', () => ({ homedir: vi.fn() }));

const HOME = join('/home', 'tester');
const originalEnv = process.env['CLAUDE_CONFIG_DIR'];

beforeEach(() => {
  vi.mocked(homedir).mockReturnValue(HOME);
  delete process.env['CLAUDE_CONFIG_DIR'];
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env['CLAUDE_CONFIG_DIR'];
  else process.env['CLAUDE_CONFIG_DIR'] = originalEnv;
  vi.resetAllMocks();
});

describe('resolveConfigDir', () => {
  it('prefers the explicit value over the environment variable', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '/tmp/env';

    expect(resolveConfigDir('/tmp/explicit')).toBe('/tmp/explicit');
  });

  it('uses the environment variable when there is no explicit value', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '/tmp/env';

    expect(resolveConfigDir()).toBe('/tmp/env');
  });

  it('returns null when both are unset', () => {
    expect(resolveConfigDir()).toBeNull();
  });

  it('treats an empty explicit value as unset', () => {
    expect(resolveConfigDir('')).toBeNull();
  });

  it('treats a whitespace-only explicit value as unset', () => {
    expect(resolveConfigDir('   ')).toBeNull();
  });

  it('falls through to the environment when the explicit value is blank', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '/tmp/env';

    expect(resolveConfigDir('   ')).toBe('/tmp/env');
  });

  it('treats an empty or whitespace-only environment value as unset', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '';
    expect(resolveConfigDir()).toBeNull();

    process.env['CLAUDE_CONFIG_DIR'] = '   ';
    expect(resolveConfigDir()).toBeNull();
  });

  it('trims the returned value', () => {
    expect(resolveConfigDir('  /tmp/cfg  ')).toBe('/tmp/cfg');
  });

  it('expands a leading ~/ to the home directory', () => {
    expect(resolveConfigDir('~/x')).toBe(join(HOME, 'x'));
  });

  it('expands a leading ~\\ to the home directory', () => {
    expect(resolveConfigDir('~\\x')).toBe(join(HOME, 'x'));
  });

  it('expands the environment value too', () => {
    process.env['CLAUDE_CONFIG_DIR'] = '~/env-cfg';

    expect(resolveConfigDir()).toBe(join(HOME, 'env-cfg'));
  });

  it('leaves other values unchanged, including relative paths', () => {
    expect(resolveConfigDir('relative/cfg')).toBe('relative/cfg');
    expect(resolveConfigDir('~notatilde/cfg')).toBe('~notatilde/cfg');
  });
});
