export type Role = "MEMBER" | "ADMIN";

/**
 * The identity a session gives the services. Current permissions are checked against the
 * database.
 */
export type Actor = { id: string; role: Role };

/** The account data sent to its owner or an administrator; no password or session token. */
export type AccountDTO = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
};
