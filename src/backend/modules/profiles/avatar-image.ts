import sharp from "sharp";
import { DomainError } from "../../common/errors";

export const maxAvatarBytes = 2097152;

// libvips exposes APNG as a static PNG; inspect bounded chunk boundaries as well.
function assertStaticPng(bytes: Buffer) {
  if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    throw new Error("invalid PNG");
  for (let offset = 8; offset < bytes.length;) {
    if (bytes.length - offset < 12) throw new Error("truncated PNG");
    const length = bytes.readUInt32BE(offset),
      end = offset + 12 + length,
      type = bytes.toString("ascii", offset + 4, offset + 8);
    if (end > bytes.length) throw new Error("truncated PNG");
    if (["acTL", "fcTL", "fdAT"].includes(type)) throw new Error("animated PNG");
    if (type === "IEND") {
      if (length !== 0 || end !== bytes.length) throw new Error("invalid PNG end");
      return;
    }
    offset = end;
  }
  throw new Error("missing PNG end");
}

// Decode a bounded single-frame image and keep only canonical, metadata-free pixels.
export async function normalizeAvatar(
  bytes: Uint8Array,
  contentType: string,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const formats: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpeg",
      "image/webp": "webp",
    };
    if (!formats[contentType] || !bytes.length || bytes.length > maxAvatarBytes)
      throw new Error("invalid image");
    const input = Buffer.from(bytes);
    if (contentType === "image/png") assertStaticPng(input);
    const image = sharp(input, { limitInputPixels: 16777216, failOn: "warning" });
    const meta = await image.metadata();
    if (
      meta.format !== formats[contentType] ||
      !meta.width ||
      !meta.height ||
      meta.width > 4096 ||
      meta.height > 4096 ||
      (meta.pages ?? 1) !== 1
    )
      throw new Error("invalid image");
    const output = await image
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
    if (output.length > 98304) throw new Error("invalid image");
    return Uint8Array.from(output);
  } catch {
    throw new DomainError("VALIDATION", { avatar: ["invalid_image"] });
  }
}
