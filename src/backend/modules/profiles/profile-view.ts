import type { Prisma } from "@/generated/prisma/client";
import type { PublicProfile } from "@/shared/profiles";

export const publicProfileSelect = {
  id: true,
  displayName: true,
  createdAt: true,
  avatar: { select: { revision: true } },
} satisfies Prisma.UserSelect;
export type ProfileRecord = Prisma.UserGetPayload<{ select: typeof publicProfileSelect }>;

// Member-facing projections deliberately omit private account and authentication fields.
export function publicProfile(user: ProfileRecord): PublicProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    joinedAt: user.createdAt.toISOString(),
    avatarUrl: user.avatar
      ? `/api/profiles/${user.id}/avatar?v=${user.avatar.revision}`
      : "/default-avatar.svg",
  };
}
