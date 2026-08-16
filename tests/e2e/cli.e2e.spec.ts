import { execFile, spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end guard at the level the user actually interacts with: the
 * compiled `ailimits` binary, run as a real process with its output
 * redirected (piped, so no TTY).
 *
 * The unit tests all mock something. This one compiles `src/`, runs
 * `dist/cli.js`, and asserts on the bytes a user would see — so it fails if
 * a failure path regresses to a bare `Error`, if the stable error code stops
 * being printed, or if escape codes leak into redirected output.
 *
 * The run is made deterministic and offline by pointing the credential
 * lookup at an empty home directory and shadowing the OS credential store
 * with a stub that always fails — so it never reaches the network.
 */
const execFileAsync = promisify(execFile);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(ROOT, 'dist', 'cli.js');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

let sandbox: string;
let fakeHome: string;
let stubBin: string;

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Environment with no credentials reachable and no colour preference set. */
function cliEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    // Stub store first, so `security` / `powershell` never find real creds.
    PATH: `${stubBin}${delimiter}${process.env['PATH'] ?? ''}`,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    // FORCE_COLOR / NO_COLOR / TERM deliberately absent: the decision must
    // come from the stream itself.
    ...extra,
  };
}

/** Runs the compiled CLI with stdout/stderr piped (i.e. redirected). */
function runCli(env: NodeJS.ProcessEnv): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI], {
      cwd: sandbox,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

beforeAll(async () => {
  // Test the shipped artifact, not a stale one.
  await execFileAsync(process.execPath, [TSC, '-p', ROOT], { cwd: ROOT });

  sandbox = mkdtempSync(join(tmpdir(), 'ailimits-e2e-'));
  fakeHome = join(sandbox, 'home');
  stubBin = join(sandbox, 'bin');
  mkdirSync(fakeHome);
  mkdirSync(stubBin);

  for (const name of ['security', 'powershell', 'powershell.exe']) {
    const stub = join(stubBin, name);
    writeFileSync(stub, '#!/bin/sh\nexit 1\n');
    chmodSync(stub, 0o755);
  }
}, 180_000);

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

describe('compiled CLI with no credentials available', () => {
  it('exits 1 and reports the stable error code on stderr', async () => {
    const result = await runCli(cliEnv());

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Error [CREDENTIALS_NOT_FOUND]');
    // A real message, not a placeholder or an empty code block.
    expect(result.stderr).toMatch(/Error \[CREDENTIALS_NOT_FOUND\]: \S+/);
    expect(result.stdout).toBe('');
  });

  it('emits no escape codes when stderr is redirected', async () => {
    const result = await runCli(cliEnv());

    expect(result.stderr).not.toContain('\x1b');
  });

  it('paints the error red and bold when colour is forced on', async () => {
    const result = await runCli(cliEnv({ FORCE_COLOR: '1' }));

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('\x1b[31m');
    expect(result.stderr).toContain('\x1b[1m');
    expect(result.stderr).toContain('CREDENTIALS_NOT_FOUND');
  });

  it('stays uncoloured when NO_COLOR wins over a TTY assumption', async () => {
    const result = await runCli(cliEnv({ NO_COLOR: '1' }));

    expect(result.stderr).not.toContain('\x1b');
    expect(result.stderr).toContain('CREDENTIALS_NOT_FOUND');
  });
});
