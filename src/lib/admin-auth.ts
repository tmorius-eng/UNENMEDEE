import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/**
 * Single-editor admin auth (CLAUDE.md: "simple cookie checking ADMIN_SECRET_PASSWORD").
 * The cookie is "<issuedAt>.<HMAC-SHA256(secret, label|issuedAt)>": it proves knowledge of the
 * password without storing it, expires after SESSION_MAX_AGE_S even if copied, and rotating
 * the password logs every session out. Web Crypto keeps this usable from proxy.ts and actions.
 */
export const ADMIN_COOKIE = "iltod_admin";
export const SESSION_MAX_AGE_S = 7 * 24 * 3600;
const LABEL = "iltod-admin-session-v2";

function secret(): string | null {
  const s = process.env.ADMIN_SECRET_PASSWORD;
  return s && s.length >= 12 ? s : null;
}

export function adminConfigured(): boolean {
  return secret() !== null;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(issuedAt: number): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${LABEL}|${issuedAt}`)));
}

/** A fresh session token, or null when no admin password is configured. */
export async function createToken(now = Date.now()): Promise<string | null> {
  const issuedAt = Math.floor(now / 1000);
  const mac = await sign(issuedAt);
  return mac ? `${issuedAt}.${mac}` : null;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export async function isValidToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  const m = token?.match(/^(\d{1,12})\.([0-9a-f]{64})$/);
  if (!m) return false;
  const issuedAt = Number(m[1]);
  const age = now / 1000 - issuedAt;
  if (age < -60 || age > SESSION_MAX_AGE_S) return false;
  const expected = await sign(issuedAt);
  return Boolean(expected && safeEqual(m[2], expected));
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  // The expiry check reads the clock: keep admin pages out of (runtime) prerendering.
  await connection();
  return isValidToken(token);
}

/**
 * Call at the top of EVERY admin server action and page. proxy.ts is only an
 * optimistic redirect; server actions can be invoked directly by POST.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export function checkPassword(input: string): boolean {
  const s = secret();
  return Boolean(s && safeEqual(input, s));
}
