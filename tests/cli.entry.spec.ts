import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';

const exec = promisify(execFile);

const root = fileURLToPath(new URL('..', import.meta.url));
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** Runs the built CLI the way the `bin` entry does, never throwing. */
async function runCli(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await exec(process.execPath, [cliPath, ...args], {
      cwd: root,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

beforeAll(async () => {
  if (!existsSync(cliPath)) {
    await exec('npm', ['run', 'build'], { cwd: root });
  }
}, 120_000);

/**
 * End-to-end guard for the `bin` entry point. The unit tests all import
 * `src/cli.ts`, where the entry-point guard is false by construction — so only
 * a real subprocess can prove the guard still lets the CLI run. If it
 * regressed, the process would exit 0 having printed nothing.
 */
describe('dist/cli.js as the process entry point', () => {
  it('keeps the shebang as its first line', async () => {
    const source = await readFile(cliPath, 'utf8');
    expect(source.split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it('actually executes and produces output when invoked directly', async () => {
    const { code, stdout, stderr } = await runCli([]);

    expect(stdout + stderr).not.toBe('');
    expect([0, 1]).toContain(code);
  }, 30_000);

  it('emits JSON on stdout for --json when the run succeeds', async () => {
    const { code, stdout, stderr } = await runCli(['--json']);

    if (code === 0) {
      expect(() => {
        JSON.parse(stdout);
      }).not.toThrow();
    } else {
      // No credentials / no network here: still proves the entry ran.
      expect(stderr).toContain('Error');
    }
  }, 30_000);
});
