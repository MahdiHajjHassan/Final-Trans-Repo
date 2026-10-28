import { setTimeout } from "node:timers/promises";
import { DomainError } from "../common/errors";

export function isBusy(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 5 || error instanceof DomainError)
    return false;
  const details = error as Record<string, unknown>;
  // Prisma can wrap SQLite lock errors in either of these codes.
  if (details.code === "P2034" || details.code === "P1008") return true;
  for (const code of [details.code, details.originalCode]) {
    if (typeof code === "string" && /^SQLITE_(BUSY|LOCKED)(_|$)/.test(code)) return true;
  }
  return [details.cause, details.meta, details.driverAdapterError].some((cause) =>
    isBusy(cause, depth + 1),
  );
}

// Retry the whole transaction when another SQLite writer holds the lock.
export async function withWriteRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isBusy(error)) throw error;
      if (attempt === 2) throw new DomainError("CONFLICT", { database: ["busy"] }, 1);
      await setTimeout(15 * (attempt + 1));
    }
  }
}
