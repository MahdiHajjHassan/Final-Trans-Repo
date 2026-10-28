import { hash, verify } from "@node-rs/argon2";

// Argon2 adds a random salt and stores its settings in the hash, ready for later
// verification.
export function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

// Checks a password against its saved hash. A broken hash is a failed check too.
export async function verifyPassword(encoded: string, password: string): Promise<boolean> {
  try {
    return await verify(encoded, password);
  } catch {
    return false;
  }
}
