import { DomainError } from "../errors";
import type { ErrorCode } from "@/shared/errors";

const statuses: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};
export function jsonData(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function apiError(error: unknown): Response {
  if (error instanceof DomainError) {
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (error.retryAfterSeconds) headers.set("Retry-After", String(error.retryAfterSeconds));
    return Response.json(
      { error: { code: error.code, ...(error.fields ? { fields: error.fields } : {}) } },
      { status: statuses[error.code], headers },
    );
  }
  console.error("Request failed", { type: error instanceof Error ? error.name : "UnknownError" });
  return Response.json(
    { error: { code: "INTERNAL" } },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function handleApi(operation: () => Promise<Response>): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    return apiError(error);
  }
}
