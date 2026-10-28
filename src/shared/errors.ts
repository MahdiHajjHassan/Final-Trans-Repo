export type ErrorCode =
  "VALIDATION" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED";
export type ErrorFields = Record<string, string[]>;
export type ApiError = { error: { code: ErrorCode | "INTERNAL"; fields?: ErrorFields } };
