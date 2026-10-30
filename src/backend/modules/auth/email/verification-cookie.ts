export const verificationCookieName = "__Host-taskboard_verification";

// A verification cookie identifies only its pending attempt and never authenticates a user.
export function readVerificationToken(request: Request): string | null {
  const matches = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.startsWith(`${verificationCookieName}=`));
  return matches.length === 1 ? matches[0].slice(verificationCookieName.length + 1) : null;
}
export function verificationCookie(token: string, expiresAt: Date) {
  return `${verificationCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600; Expires=${expiresAt.toUTCString()}`;
}
export const clearedVerificationCookie = `${verificationCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
