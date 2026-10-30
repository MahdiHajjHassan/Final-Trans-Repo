import type { PublicProfile } from "./profiles";
export type Relationship = "SELF" | "NONE" | "OUTGOING" | "INCOMING" | "FRIEND";
export type FriendshipDTO = {
  id: string;
  status: "PENDING" | "ACCEPTED";
  requestedById: string;
  profile: PublicProfile;
  online: boolean | null;
};
export type FriendList = { items: FriendshipDTO[]; total: number; page: number; pageSize: 25 };
