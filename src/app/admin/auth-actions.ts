"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, adminConfigured, checkPassword, createToken, SESSION_MAX_AGE_S } from "@/lib/admin-auth";
import { clientIp, failureLimiter } from "@/lib/rate-limit";

/**
 * Login/logout live apart from the other admin actions on purpose: this module imports
 * nothing heavy, so a broken dependency elsewhere (jsdom once crashed on Vercel's runtime
 * and took the whole actions module down with it) can never lock the editor out.
 */

/** 5 wrong passwords per IP in 15 minutes, then the IP waits (on top of the 800 ms delay). */
const loginFailures = failureLimiter(5, 15 * 60_000);

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "ADMIN_SECRET_PASSWORD тохируулаагүй (12+ тэмдэгт) байна." };
  // Pasted passwords often carry a trailing space or newline from the clipboard.
  const password = String(formData.get("password") ?? "").trim();
  const ip = clientIp(await headers());
  if (loginFailures.blocked(ip)) return { error: "Олон удаа буруу оролдлоо. 15 минут хүлээгээд дахин оролдоно уу." };
  if (!checkPassword(password)) {
    loginFailures.fail(ip);
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "Нууц үг буруу байна." };
  }
  loginFailures.clear(ip);
  const token = await createToken();
  (await cookies()).set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" (not "strict"): the session must survive opening /admin from a link or the home-screen app.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
