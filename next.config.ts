import type { NextConfig } from "next";

const config: NextConfig = { poweredByHeader: false, agentRules: false, experimental: { cpus: 1 }, serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3", "better-sqlite3", "@node-rs/argon2"] };
export default config;
