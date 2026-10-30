import { DomainError } from "../errors";

// Enforce the actual body size even if a sender omits or understates Content-Length.
export async function readBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const stated = request.headers.get("content-length");
  if (stated && (!/^\d+$/.test(stated) || Number(stated) > maxBytes))
    throw new DomainError("VALIDATION", { avatar: ["too_large"] });
  if (!request.body) throw new DomainError("VALIDATION", { avatar: ["required"] });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new DomainError("VALIDATION", { avatar: ["too_large"] });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return bytes;
  } finally {
    reader.releaseLock();
  }
}
