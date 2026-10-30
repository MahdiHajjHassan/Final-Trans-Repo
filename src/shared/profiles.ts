export type PublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
};
export type ProfileList = { items: PublicProfile[]; total: number; page: number; pageSize: 25 };
export type ProfilePage = PublicProfile & {
  relationship: import("./friends").Relationship;
  online: boolean | null;
};
