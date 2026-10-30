/** Expected failures understood by both the backend and the translated UI. */
export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "EMAIL_UNVERIFIED"
  | "EMAIL_UNAVAILABLE"
  | "INVALID_CODE";

/** Field names (including nested paths) mapped to the validation errors they contain. */
export type ErrorFields = Record<string, string[]>;

/** The account/admin/game error envelope. Unexpected failures use INTERNAL. */
export type ApiError = { error: { code: ErrorCode | "INTERNAL"; fields?: ErrorFields } };
