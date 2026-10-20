import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Single-editor admin auth (CLAUDE.md: "simple cookie checking ADMIN_SECRET_PASSWORD").
 * The cookie holds HMAC-SHA256(secret, label): it proves knowledge of the password
 * without storing it, and rotating the password logs every session out.
 * Web Crypto keeps this usable from proxy.ts and from server actions.
 */
export const ADMIN_COOKIE = "iltod_admin";
const LABEL = "iltod-admin-session-v1";

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

export async function expectedToken(): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(LABEL)));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const expected = await expectedToken();
  return Boolean(expected && token && safeEqual(token, expected));
}

export async function isAdmin(): Promise<boolean> {
  return isValidToken((await cookies()).get(ADMIN_COOKIE)?.value);
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
