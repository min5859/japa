// Design Ref: §1 GATE 3 (BELT-AND-SUSPENDERS) — re-validate email after OTP exchange
// Plan SC: SC-2 (매직 링크 클릭 → /dashboard 진입)

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    console.error(`[auth/callback] Supabase error: ${errorParam}`, errorDescription);
    return redirectToLogin(request, "auth_failed");
  }

  if (!code) {
    console.warn("[auth/callback] missing code param");
    return redirectToLogin(request, "invalid_callback");
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error(
      "[auth/callback] code exchange failed:",
      error?.message ?? "no session",
    );
    return redirectToLogin(request, "session_failed");
  }

  // GATE 3 — re-validate email allowlist after session is granted
  const email = data.session.user.email;
  if (!isAllowedEmail(email)) {
    console.error(
      `[auth/callback] unauthorized email: ${email ?? "(null)"}`,
    );
    await supabase.auth.signOut();
    return redirectToLogin(request, "unauthorized_email");
  }

  // Success — Supabase SSR has already set httpOnly cookie via createSupabaseServerClient.
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

function redirectToLogin(request: NextRequest, errorCode: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  return NextResponse.redirect(loginUrl);
}
