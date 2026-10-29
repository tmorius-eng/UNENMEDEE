import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
import { describe, it } from "node:test";

import { Client } from "pg";

import { SUPABASE_ROOT_CA_2021 } from "@/db/supabase-ca";
import { databaseTls, withoutSslParams } from "@/db/tls";

describe("database TLS is verified", () => {
  it("bundles Supabase's root CA, the same file the watchdog dates", () => {
    const cert = new X509Certificate(SUPABASE_ROOT_CA_2021);
    assert.match(cert.subject, /CN=Supabase Root 2021 CA/);
    assert.equal(cert.fingerprint256, "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA");
    assert.equal(readFileSync("certs/supabase-root-2021-ca.pem", "utf8").trim(), SUPABASE_ROOT_CA_2021);
  });

  it("verifies the chain and the host name, and can take one more root", () => {
    const tls = databaseTls({});
    assert.equal(tls.rejectUnauthorized, true);
    assert.deepEqual(tls.ca, [SUPABASE_ROOT_CA_2021]);
    assert.equal((databaseTls({ DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----\\nAAA\\n-----END CERTIFICATE-----" }).ca as string[])[1], "-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----");
  });

  it("drops ssl* parameters from the URL, which would replace the verified settings", () => {
    const base = "postgresql://postgres.ref:p%40ss@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
    assert.equal(withoutSslParams(base), base, "untouched without ssl parameters");
    assert.equal(withoutSslParams(`${base}?sslmode=no-verify`), base);
    assert.equal(withoutSslParams(`${base}?sslmode=require&pgbouncer=true&sslrootcert=x`), `${base}?pgbouncer=true`);
    for (const q of ["", "?sslmode=require", "?sslmode=no-verify"]) {
      const c = new Client({ connectionString: withoutSslParams(`${base}${q}`), ssl: databaseTls({}) });
      const ssl = (c as unknown as { connectionParameters: { ssl: { rejectUnauthorized?: boolean; ca?: unknown } } }).connectionParameters.ssl;
      assert.equal(ssl.rejectUnauthorized, true, q);
      assert.ok(ssl.ca, q);
    }
  });
});
