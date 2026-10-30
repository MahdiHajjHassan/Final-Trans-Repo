import { DomainError } from "../errors";
// Duplicate query keys must not silently change a caller's filter or page.
export function strictQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  if (new Set(params.keys()).size !== [...params.keys()].length)
    throw new DomainError("VALIDATION");
  return Object.fromEntries(params);
}
