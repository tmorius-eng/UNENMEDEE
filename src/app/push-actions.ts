"use server";

import { eq } from "drizzle-orm";

import { getDb, hasDatabase } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { isAllowedPushEndpoint, SubscriptionSchema, TEST_PAYLOAD } from "@/lib/push/core";
import { sendToEndpoint } from "@/lib/push/server";

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

// One test per endpoint per minute (per server instance): enough to stop button mashing.
const lastTest = new Map<string, number>();

/** Sends a test notification to the caller's own, already stored subscription. */
export async function sendTestPush(endpoint: unknown): Promise<{ ok: boolean; error?: string }> {
  if (typeof endpoint !== "string" || !isAllowedPushEndpoint(endpoint) || !hasDatabase()) return { ok: false, error: "Мэдэгдэл бүртгэгдээгүй байна." };
  const now = Date.now();
  if (now - (lastTest.get(endpoint) ?? 0) < 60_000) return { ok: false, error: "1 минутын дараа дахин оролдоно уу." };
  lastTest.set(endpoint, now);
  const res = await sendToEndpoint(getDb(), endpoint, TEST_PAYLOAD);
  if (res.ok) return { ok: true };
  return { ok: false, error: res.status === 404 || res.status === 410 ? "Бүртгэл хүчингүй болсон. Мэдэгдлээ дахин асаана уу." : `Илгээж чадсангүй (${res.status ?? "алдаа"}).` };
}
