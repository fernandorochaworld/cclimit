import { describe, expect, it } from 'vitest';
import { parseOauth } from '../../../src/adapters/credentials/parse.js';

const blob = JSON.stringify({
  claudeAiOauth: {
    accessToken: 'sk-ant-oat-token',
    expiresAt: 1_800_000_000_000,
    scopes: ['user:inference', 'user:profile'],
  },
});

describe('parseOauth', () => {
  it('maps a valid blob to the domain credentials', () => {
    expect(parseOauth(blob)).toEqual({
      accessToken: 'sk-ant-oat-token',
      expiresAt: 1_800_000_000_000,
      scopes: ['user:inference', 'user:profile'],
    });
  });

  it('strips a leading UTF-8 BOM', () => {
    expect(parseOauth(`﻿${blob}`)?.accessToken).toBe('sk-ant-oat-token');
  });

  it('returns null for an empty or whitespace-only string', () => {
    expect(parseOauth('')).toBeNull();
    expect(parseOauth('   \n\t ')).toBeNull();
  });

  it('returns null when the JSON has no claudeAiOauth block', () => {
    expect(parseOauth('{"other":true}')).toBeNull();
  });

  it('returns null when claudeAiOauth has no accessToken', () => {
    expect(parseOauth('{"claudeAiOauth":{"expiresAt":1}}')).toBeNull();
  });

  it('throws on invalid JSON (documents current behaviour)', () => {
    expect(() => parseOauth('not json')).toThrow(SyntaxError);
  });
});
