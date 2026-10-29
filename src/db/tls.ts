import type { ConnectionOptions } from "node:tls";

import { SUPABASE_ROOT_CA_2021 } from "./supabase-ca";

/**
 * TLS to a remote PostgreSQL with the server's certificate chain and host name verified.
 *
 * Until Oct 2026 every client connected with `rejectUnauthorized: false` (node-postgres) or
 * postgres.js's "require": encrypted, but anyone able to intercept the connection could have
 * answered as the database and been sent the password. Supabase signs its servers with its own
 * root (supabase-ca.ts), which Node does not trust by default, so it is passed explicitly.
 * `DATABASE_SSL_CA` (a PEM, "\n" escapes allowed) adds another root, for a database elsewhere.
 */
export function databaseTls(env: Record<string, string | undefined> = process.env): ConnectionOptions {
  const extra = env.DATABASE_SSL_CA?.trim();
  return { ca: [SUPABASE_ROOT_CA_2021, ...(extra ? [extra.replace(/\\n/g, "\n")] : [])], rejectUnauthorized: true };
}

/**
 * The connection string without its `ssl*` parameters. node-postgres lets them replace the `ssl`
 * option wholesale: `?sslmode=require` dropped our CA (the connection would fail) and
 * `?sslmode=no-verify` switched verification off. TLS is configured in code only.
 */
export function withoutSslParams(url: string): string {
  if (!/[?&]ssl/i.test(url)) return url;
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) if (/^ssl/i.test(key)) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return url;
  }
}
