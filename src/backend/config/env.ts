import { resolve } from "node:path";
import { z } from "zod";
import { emailSchema, passwordSchema } from "../../shared/auth-validation";

// APP_ORIGIN must be an HTTPS origin only: no credentials, path, query or fragment.
const origin = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  }, "APP_ORIGIN must be an HTTPS origin without credentials, query, or path")
  .transform((value) => new URL(value).origin);

const configSchema = z.object({
  DATABASE_URL: z.string().default("file:./data/tictactoe.db"),
  APP_ORIGIN: origin,
  ADMIN_EMAIL: emailSchema,
  ADMIN_PASSWORD: passwordSchema,
});

export type MailConfig = {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
  isolatedTest: boolean;
};

// Public SMTP always authenticates over TLS. Only the isolated mailpit sidecar is plaintext.
function mailConfig(environment: Record<string, string | undefined>): MailConfig | undefined {
  const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"];
  if (!keys.some((key) => environment[key])) return undefined;
  const host = z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/)
    .parse(environment.SMTP_HOST);
  const port = z.coerce
    .number()
    .int()
    .parse(environment.SMTP_PORT || "465");
  const isolatedTest =
    host === "mailpit" &&
    port === 1025 &&
    /^tictactoe-e2e-[a-z0-9-]+$/.test(environment.TICTACTOE_E2E_PROJECT ?? "");
  if (!isolatedTest && ![465, 587].includes(port))
    throw new Error("Public SMTP requires port 465 or 587");
  const from = emailSchema.parse(environment.SMTP_FROM_EMAIL);
  return {
    host,
    port,
    from,
    isolatedTest,
    ...(!isolatedTest
      ? {
          user: z
            .string()
            .min(1)
            .max(1000)
            .refine(
              (value) => value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value),
              "Invalid SMTP username",
            )
            .parse(environment.SMTP_USER),
          password: z.string().min(1).max(1000).parse(environment.SMTP_PASSWORD),
        }
      : {}),
  };
}

// Only local SQLite files are supported. Resolve a relative path from the working directory.
export function resolveDatabaseUrl(value: string): string {
  if (
    !value.startsWith("file:") ||
    !value.slice(5) ||
    value.includes("\0") ||
    value.includes("?")
  ) {
    throw new Error("DATABASE_URL must identify a local SQLite file");
  }
  return `file:${resolve(value.slice(5))}`;
}

// Validate environment values before building services or seeding the administrator.
export function loadConfig(environment: Record<string, string | undefined>) {
  const input = configSchema.parse(environment);
  return {
    databaseUrl: resolveDatabaseUrl(input.DATABASE_URL),
    appOrigin: input.APP_ORIGIN,
    adminEmail: input.ADMIN_EMAIL,
    adminPassword: input.ADMIN_PASSWORD,
    mail: mailConfig(environment),
  };
}

export type ServerConfig = ReturnType<typeof loadConfig>;
