"use client";

/** The API error code and its field errors, ready for the form to display. */
export class RequestError extends Error {
  constructor(
    public code: string,
    public fields?: Record<string, string[]>,
    public retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

/**
 * Sends one JSON call with the session cookie and returns the data from its answer.
 * A failed fetch becomes NETWORK; HTTP failures keep the backend's error code.
 */
export async function request<T = unknown>(
  url: string,
  method: string,
  data?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  } catch {
    throw new RequestError("NETWORK");
  }
  return decodeResponse<T>(response);
}

/** Unwraps { data } or throws the API error. A 204 response has no JSON body. */
export async function decodeResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const delay = response.headers.get("Retry-After");
    const retryAfter = delay && /^\d{1,5}$/.test(delay) ? Number(delay) : undefined;
    throw new RequestError(
      result.error?.code ?? "INTERNAL",
      result.error?.fields,
      retryAfter && retryAfter <= 86400 ? retryAfter : undefined,
    );
  }
  return result.data as T;
}
