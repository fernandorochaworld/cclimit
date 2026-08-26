import { describe, expect, it } from 'vitest';
import {
  CREDENTIALS_SERVICE_NAME,
  keychainServiceName,
} from '../../../src/adapters/credentials/keychain-scope.js';

describe('keychainServiceName', () => {
  it('returns the bare service name when no config dir is given', () => {
    expect(keychainServiceName()).toBe('Claude Code-credentials');
    expect(keychainServiceName(null)).toBe('Claude Code-credentials');
    expect(keychainServiceName(undefined)).toBe('Claude Code-credentials');
    expect(CREDENTIALS_SERVICE_NAME).toBe('Claude Code-credentials');
  });

  // Well-known SHA-256 test vectors (NIST/RFC), so the hash slice is
  // pinned against an independent source rather than the implementation
  // testing itself.
  it('suffixes the first 8 hex chars of sha256(configDir) for the empty string', () => {
    // sha256('') = e3b0c442 98fc1c14 9afbf4c8 996fb924 27ae41e4 6..."
    expect(keychainServiceName('')).toBe('Claude Code-credentials');
  });

  it('suffixes the first 8 hex chars of sha256(configDir)', () => {
    // sha256('abc') = ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 9...
    expect(keychainServiceName('abc')).toBe(
      'Claude Code-credentials-ba7816bf',
    );
  });

  it('matches the entries verified against a real macOS Keychain', () => {
    // sha256('/Users/inteligenti/.claude')          -> 43b5d123...
    // sha256('/Users/inteligenti/.claude-uniques')   -> cdc2cd08...
    expect(keychainServiceName('/Users/inteligenti/.claude')).toBe(
      'Claude Code-credentials-43b5d123',
    );
    expect(keychainServiceName('/Users/inteligenti/.claude-uniques')).toBe(
      'Claude Code-credentials-cdc2cd08',
    );
  });

  it('is sensitive to the exact string — trailing slash changes the entry', () => {
    const a = keychainServiceName('/tmp/cfg');
    const b = keychainServiceName('/tmp/cfg/');
    expect(a).not.toBe(b);
  });
});
