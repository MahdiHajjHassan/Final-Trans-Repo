import { resolve } from "node:path";
/** @param {Record<string, string | undefined>} inherited @param {string} checkout */
export function rehearsalEnvironment(inherited, checkout) {
  const env = { ...inherited };
  for (const key of Object.keys(env)) {
    const normalized = key.toUpperCase();
    if (
      normalized.startsWith("DOTENV_") ||
      [
        "DATABASE_URL",
        "APP_ORIGIN",
        "HTTPS_PORT",
        "ADMIN_EMAIL",
        "ADMIN_PASSWORD",
        "NODE_OPTIONS",
        "TICTACTOE_E2E_ENV_FILE",
        "TICTACTOE_E2E_PROJECT",
        "TICTACTOE_E2E_PORT",
      ].includes(normalized)
    )
      delete env[key];
  }
  env.DATABASE_URL = `file:${resolve(checkout, "data/tictactoe.db")}`;
  return env;
}
