import { eq } from "drizzle-orm";

import { getDb, hasDatabase, schema } from "@/db";

/**
 * Server-side sign-out. The admin cookie is a signed timestamp (admin-auth.ts), so deleting it in
 * one browser left any copy valid for up to 7 days. Logging out stores the current second here,
 * and requireAdmin() refuses every token issued at or before it: all sessions end, the editor
 * logs in again. Kept apart from admin-auth.ts so proxy.ts never loads the database driver.
 */
export const SESSION_FLOOR_KEY = "admin_session_floor";

/** Unix second up to which issued sessions are signed out (0 when never, or with no database). */
export async function sessionFloor(): Promise<number> {
  if (!hasDatabase()) return 0;
  const [row] = await getDb()
    .select({ value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, SESSION_FLOOR_KEY))
    .limit(1);
  const n = Number(row?.value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Sign out every session issued up to now. */
export async function revokeSessions(now = Date.now()): Promise<void> {
  if (!hasDatabase()) return;
  const value = String(Math.floor(now / 1000));
  await getDb()
    .insert(schema.appSettings)
    .values({ key: SESSION_FLOOR_KEY, value })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: new Date(now) } });
}
