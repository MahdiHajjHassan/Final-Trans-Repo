import type { ErrorCode, ErrorFields } from "@/shared/errors";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly fields?: ErrorFields,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "DomainError";
  }
}
