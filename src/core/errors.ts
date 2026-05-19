/**
 * Custom error hierarchy for ailimits.
 *
 * Every failure the library can raise is an `AiLimitsError` carrying a
 * stable, machine-readable `code`. Client applications should `catch` and
 * branch on `error.code` (or `instanceof`) rather than parsing messages —
 * the codes are part of the public API and will not change between minor
 * releases.
 */

/** Stable, machine-readable identifiers for every failure mode. */
export const ErrorCode = {
  /** Claude Code OAuth credentials could not be located. */
  CredentialsNotFound: 'CREDENTIALS_NOT_FOUND',
  /** The access token was rejected by the usage endpoint (HTTP 401). */
  AuthenticationFailed: 'AUTHENTICATION_FAILED',
  /** The usage request failed with a non-OK, non-401 HTTP status. */
  UsageRequestFailed: 'USAGE_REQUEST_FAILED',
  /** The usage endpoint returned a body that could not be parsed. */
  UsageResponseInvalid: 'USAGE_RESPONSE_INVALID',
  /** A network-level failure prevented the usage request from completing. */
  NetworkError: 'NETWORK_ERROR',
} as const;

/** Union of every {@link ErrorCode} value. */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Base class for every error this library raises.
 *
 * Carries a discriminating {@link code} so callers can intercept and treat
 * specific failures without depending on human-readable messages.
 */
export abstract class AiLimitsError extends Error {
  /** Machine-readable failure identifier; stable across releases. */
  abstract readonly code: ErrorCode;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // Without this, `error.name` would always read "Error".
    this.name = new.target.name;
  }
}

/** Claude Code OAuth credentials could not be found on this machine. */
export class CredentialsNotFoundError extends AiLimitsError {
  readonly code = ErrorCode.CredentialsNotFound;
}

/** The usage endpoint rejected the access token (HTTP 401). */
export class AuthenticationError extends AiLimitsError {
  readonly code = ErrorCode.AuthenticationFailed;
}

/** The usage endpoint responded with a non-OK, non-401 HTTP status. */
export class UsageRequestError extends AiLimitsError {
  readonly code = ErrorCode.UsageRequestFailed;

  constructor(
    message: string,
    /** The HTTP status code returned by the usage endpoint. */
    readonly status: number,
    /** The HTTP status text returned by the usage endpoint. */
    readonly statusText: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/** The usage endpoint returned a body that could not be parsed. */
export class UsageResponseError extends AiLimitsError {
  readonly code = ErrorCode.UsageResponseInvalid;
}

/** A network-level failure prevented the usage request from completing. */
export class NetworkError extends AiLimitsError {
  readonly code = ErrorCode.NetworkError;
}
