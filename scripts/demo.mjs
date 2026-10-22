#!/usr/bin/env node
/**
 * `npm run demo`: the whole site on sample data, with no database server and no API keys.
 * Loads real saved responses (tests/fixtures) into an in-process Postgres (PGlite) in .demo-db/,
 * then starts `next dev`. Works the same on Windows, macOS and Linux.
 */
import { spawnSync, spawn } from "node:child_process";

const env = { ...process.env, DATABASE_URL: "pglite:./.demo-db", NEXT_PUBLIC_DEMO: "1" };
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const seed = spawnSync(npx, ["tsx", "scripts/seed-demo.ts"], { stdio: "inherit", env, shell: process.platform === "win32" });
if (seed.status !== 0) process.exit(seed.status ?? 1);

console.log("\n▶ http://localhost:3000  (Ctrl+C to stop)\n");
const dev = spawn(npx, ["next", "dev", ...process.argv.slice(2)], { stdio: "inherit", env, shell: process.platform === "win32" });
dev.on("exit", (code) => process.exit(code ?? 0));
