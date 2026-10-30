import { DomainError } from "./errors";
import type { ErrorCode } from "@/shared/errors";

// The error codes the services speak, translated into HTTP status codes.
const statuses: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EMAIL_UNVERIFIED: 403,
  EMAIL_UNAVAILABLE: 503,
  INVALID_CODE: 400,
};

// These success responses use { data }. Private answers are not cached.
export function jsonData(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
}

// Known failures keep their code and field errors. Unexpected failures leave as a plain
// INTERNAL error.
export function apiError(error: unknown): Response {
  if (error instanceof DomainError) {
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (error.retryAfterSeconds) headers.set("Retry-After", String(error.retryAfterSeconds));
    return Response.json(
      { error: { code: error.code, ...(error.fields ? { fields: error.fields } : {}) } },
      { status: statuses[error.code], headers },
    );
  }

  // Log the error type only; request bodies and credentials do not belong in logs.
  console.error("Request failed", { type: error instanceof Error ? error.name : "UnknownError" });
  return Response.json(
    { error: { code: "INTERNAL" } },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Wraps a route so thrown errors leave through the same HTTP error formatter.
export async function handleApi(operation: () => Promise<Response>): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    return apiError(error);
  }
}
