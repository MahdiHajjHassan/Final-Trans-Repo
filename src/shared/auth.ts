export type Role = "MEMBER" | "ADMIN";
export type Actor = { id: string; role: Role };
export type AccountDTO = { id: string; email: string; displayName: string; role: Role; createdAt: string };
