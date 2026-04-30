"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyAdminPassword
} from "@/lib/auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(password: string): Promise<LoginResult> {
  if (!process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET) {
    return { ok: false, error: "서버 인증 환경변수가 설정되지 않았습니다." };
  }
  if (!verifyAdminPassword(password)) {
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  const token = await createSessionToken();
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return { ok: true };
}

export async function logout() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  redirect("/login");
}
