import "dotenv/config";
import { defineConfig } from "drizzle-kit";

import { databaseTls, withoutSslParams } from "./src/db/tls";

const url = process.env.DATABASE_URL ?? "";
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

/**
 * Structured credentials: drizzle-kit drops a separate `ssl` next to `url` and builds its pool from
 * the URL alone, so the verified TLS of src/db/tls.ts is passed with host, user and password.
 * Only `db:generate` runs in this project (it never connects); this keeps any other drizzle-kit
 * command on the same verified connection.
 */
function credentials() {
  if (!url || local) return { url };
  try {
    const u = new URL(withoutSslParams(url));
    return {
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "") || "postgres",
      ssl: databaseTls(),
    };
  } catch {
    return { url };
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: credentials(),
  strict: true,
  verbose: true,
});
