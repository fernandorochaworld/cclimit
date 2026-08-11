import { describe, expect, it } from 'vitest';
import {
  AiLimitsError,
  AuthenticationError,
  CredentialsNotFoundError,
  ErrorCode,
  NetworkError,
  UsageRequestError,
  UsageResponseError,
} from '../../src/core/errors.js';

describe('ErrorCode', () => {
  it('pins the public, machine-readable code values', () => {
    expect(ErrorCode).toEqual({
      CredentialsNotFound: 'CREDENTIALS_NOT_FOUND',
      AuthenticationFailed: 'AUTHENTICATION_FAILED',
      UsageRequestFailed: 'USAGE_REQUEST_FAILED',
      UsageResponseInvalid: 'USAGE_RESPONSE_INVALID',
      NetworkError: 'NETWORK_ERROR',
    });
  });
});

type Options = { cause?: unknown } | undefined;

describe.each([
  [
    'CredentialsNotFoundError',
    (o: Options) => new CredentialsNotFoundError('missing', o),
    'CREDENTIALS_NOT_FOUND',
  ],
  [
    'AuthenticationError',
    (o: Options) => new AuthenticationError('missing', o),
    'AUTHENTICATION_FAILED',
  ],
  [
    'UsageRequestError',
    (o: Options) => new UsageRequestError('missing', 500, 'Server Error', o),
    'USAGE_REQUEST_FAILED',
  ],
  [
    'UsageResponseError',
    (o: Options) => new UsageResponseError('missing', o),
    'USAGE_RESPONSE_INVALID',
  ],
  ['NetworkError', (o: Options) => new NetworkError('missing', o), 'NETWORK_ERROR'],
] as const)('%s', (name, create, code) => {
  it('is an AiLimitsError and an Error', () => {
    const error = create(undefined);

    expect(error).toBeInstanceOf(AiLimitsError);
    expect(error).toBeInstanceOf(Error);
  });

  it('carries its own code, name and message', () => {
    const error = create(undefined);

    expect(error.code).toBe(code);
    expect(error.name).toBe(name);
    expect(error.message).toBe('missing');
  });

  it('preserves a supplied cause', () => {
    const cause = new Error('root cause');

    expect(create({ cause }).cause).toBe(cause);
  });
});

describe('UsageRequestError', () => {
  it('stores the HTTP status and status text', () => {
    const cause = new Error('root cause');
    const error = new UsageRequestError('failed', 503, 'Unavailable', {
      cause,
    });

    expect(error.status).toBe(503);
    expect(error.statusText).toBe('Unavailable');
    expect(error.cause).toBe(cause);
  });
});
