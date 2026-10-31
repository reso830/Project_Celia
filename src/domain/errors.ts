export type DomainErrorCode =
  | "validation"
  | "not_found"
  | "duplicate_name"
  | "archived"
  | "umbrella_mismatch"
  | "same_category"
  | "invalid_state"
  | "internal";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly field?: string;

  constructor(code: DomainErrorCode, message: string, field?: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.field = field;
  }
}
