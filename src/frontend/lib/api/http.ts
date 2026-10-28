"use client";

export class RequestError extends Error {
  constructor(
    public code: string,
    public fields?: Record<string, string[]>,
  ) {
    super(code);
  }
}

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

export async function decodeResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(result.error?.code ?? "INTERNAL", result.error?.fields);
  return result.data as T;
}
