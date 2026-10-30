import { expect, test } from "vitest";
import sharp from "sharp";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAvatarService } from "@/backend/modules/profiles/avatar.service";
import { normalizeAvatar } from "@/backend/modules/profiles/avatar-image";

test("avatars re-encode each supported image, strip metadata and reject unsafe decodes", async () => {
  for (const format of ["png", "jpeg", "webp"] as const) {
    const input = await sharp({ create: { width: 64, height: 48, channels: 3, background: "red" } })
      [format]()
      .withMetadata()
      .toBuffer();
    const output = await normalizeAvatar(input, `image/${format}`);
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ width: 256, height: 256, format: "webp" });
    expect(meta.exif).toBeUndefined();
  }
  await expect(normalizeAvatar(new Uint8Array(2097153), "image/png")).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await expect(normalizeAvatar(Buffer.from("<svg/>"), "image/svg+xml")).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await expect(normalizeAvatar(Buffer.from("broken"), "image/png")).rejects.toMatchObject({
    code: "VALIDATION",
  });
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  await expect(normalizeAvatar(png, "image/jpeg")).rejects.toMatchObject({ code: "VALIDATION" });
  const wide = await sharp({ create: { width: 4097, height: 1, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  await expect(normalizeAvatar(wide, "image/png")).rejects.toMatchObject({ code: "VALIDATION" });
});
test("replacement is atomic, revision advances, reset/deletion restores defaults and quotas persist", async () => {
  const f = await createTestDb();
  try {
    const a = await seedUser(f.db),
      avatars = createAvatarService(f.db);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    const one = await avatars.put(a.actor, png, "image/png");
    expect(one.avatarUrl).toContain("v=1");
    const before = await avatars.read(a.actor, a.actor.id);
    await expect(avatars.put(a.actor, Buffer.from("bad"), "image/png")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    expect((await avatars.read(a.actor, a.actor.id)).bytes).toEqual(before.bytes);
    expect((await avatars.put(a.actor, png, "image/png")).avatarUrl).toContain("v=2");
    expect((await avatars.remove(a.actor)).avatarUrl).toBe("/default-avatar.svg");
    await avatars.put(a.actor, png, "image/png");
    await expect(avatars.put(a.actor, png, "image/png")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    await f.db.user.delete({ where: { id: a.actor.id } });
    expect(await f.db.userAvatar.count()).toBe(0);
    await expect(avatars.read(a.actor, a.actor.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  } finally {
    await f.close();
  }
});

test("animated WebP is rejected rather than silently accepting its first frame", async () => {
  const header = "47494638396101000100800000000000ffffff";
  const frame = (pixel: string) => "21f90400010000002c0000000001000100000202" + pixel + "0100";
  const gif = Buffer.from(header + frame("44") + frame("4c") + "3b", "hex");
  const webp = await sharp(gif, { animated: true })
    .webp({ loop: 0, delay: [100, 100] })
    .toBuffer();
  expect((await sharp(webp).metadata()).pages).toBe(2);
  await expect(normalizeAvatar(webp, "image/webp")).rejects.toMatchObject({ code: "VALIDATION" });
});

test("a two-frame APNG cannot replace an existing avatar even when Sharp omits its frame count", async () => {
  // Valid 1x1 RGBA APNG: acTL, two fcTL chunks, IDAT and fdAT with real CRCs.
  const apng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAABAAAAAQAAAAAAAAAAAAEACgAAWn8w0AAAAA1JREFUeJxj+M/A8B8ABQAB/4mZPR0AAAAaZmNUTAAAAAEAAAABAAAAAQAAAAAAAAAAAAEACgAAwQzaBAAAABFmZEFUAAAAAnicY2D4z/AfAAQBAf9i5+mcAAAAAElFTkSuQmCC",
    "base64",
  );
  expect((await sharp(apng).metadata()).pages).toBeUndefined();
  const f = await createTestDb();
  try {
    const member = await seedUser(f.db),
      avatars = createAvatarService(f.db);
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "blue" } })
      .png()
      .toBuffer();
    await avatars.put(member.actor, png, "image/png");
    const before = await f.db.userAvatar.findUniqueOrThrow({ where: { userId: member.actor.id } });
    await expect(avatars.put(member.actor, apng, "image/png")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    const after = await f.db.userAvatar.findUniqueOrThrow({ where: { userId: member.actor.id } });
    expect(after.data).toEqual(before.data);
    expect(after.revision).toBe(before.revision);
  } finally {
    await f.close();
  }
});
