import { isIP } from "node:net";
import { DomainError } from "../errors";

export function requireSameOrigin(request: Request, appOrigin: string): void {
  if (request.headers.get("Origin") !== appOrigin) throw new DomainError("FORBIDDEN");
}
export function clientKey(request: Request): string {
  const address = request.headers.get("X-Taskboard-Client-IP") ?? "";
  return isIP(address) ? address : "unknown";
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new DomainError("VALIDATION", { body: ["invalid_content_type"] });
  }
  const maxBytes = 16 * 1024;
  const statedLength = request.headers.get("Content-Length");
  if (statedLength && (!/^[0-9]+$/.test(statedLength) || Number(statedLength) > maxBytes)) throw new DomainError("VALIDATION", { body: ["too_large"] });
  if (!request.body) throw new DomainError("VALIDATION", { body: ["invalid_json"] });
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new DomainError("VALIDATION", { body: ["too_large"] }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let position = 0;
    for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("VALIDATION", { body: ["invalid_json"] });
  } finally { reader.releaseLock(); }
}
