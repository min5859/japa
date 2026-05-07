import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    console.error(`[auth/callback] supabase error: ${errorParam}`, errorDescription);
    return redirectToLogin(request, "auth_failed");
  }

  if (!code) {
    return redirectToLogin(request, "invalid_callback");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] code exchange failed:", error?.message ?? "no session");
    return redirectToLogin(request, "session_failed");
  }

  // Re-validate allowlist after session granted (defense in depth — the OTP send route
  // already gates by allowlist, but this prevents bypass via direct API/replay).
  if (!isAllowedEmail(data.session.user.email)) {
    console.error(`[auth/callback] unauthorized email: ${data.session.user.email ?? "(null)"}`);
    await supabase.auth.signOut();
    return redirectToLogin(request, "unauthorized_email");
  }

  return NextResponse.redirect(new URL("/", request.url));
}

function redirectToLogin(request: NextRequest, errorCode: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  return NextResponse.redirect(loginUrl);
}
