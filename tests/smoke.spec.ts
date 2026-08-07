import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../src/core/errors.js';

describe('smoke', () => {
  it('resolves ESM .js specifiers under vitest', () => {
    expect(ErrorCode.CredentialsNotFound).toBeDefined();
  });
});
