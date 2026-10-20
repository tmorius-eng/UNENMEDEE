"use server";

import { eq } from "drizzle-orm";

import { getDb, hasDatabase } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { isAllowedPushEndpoint, SubscriptionSchema } from "@/lib/push/core";

/**
 * Public server actions (no login: anyone may subscribe). Input is validated and only
 * endpoints on known browser push services are stored; nothing personal is kept.
 */

export async function subscribePush(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Энэ хөтчийн мэдэгдлийг дэмжихгүй байна." };
  if (!hasDatabase()) return { ok: false, error: "Сервер тохируулагдаагүй байна." };
  const { endpoint, keys } = parsed.data;
  await getDb()
    .insert(pushSubscriptions)
    .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth, failures: 0 } });
  return { ok: true };
}

export async function unsubscribePush(endpoint: unknown): Promise<{ ok: boolean }> {
  if (typeof endpoint !== "string" || !isAllowedPushEndpoint(endpoint) || !hasDatabase()) return { ok: false };
  await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return { ok: true };
}
