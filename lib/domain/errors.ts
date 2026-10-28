export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMITED"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly retryable: boolean;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: { cause?: unknown; retryable?: boolean } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "DomainError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
