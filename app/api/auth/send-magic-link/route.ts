// Design Ref: §1 GATE 2 (PRIMARY SECURITY GATE) — server-side allowlist enforcement
// Plan SC: SC-3 (비-allowlist 이메일 시 메일 미발송)
// 보안 리뷰: OWASP A01/A07 — email enumeration 차단

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const BodySchema = z.object({
  email: z.string().email().toLowerCase(),
});

const GENERIC_RESPONSE = {
  ok: true,
  message:
    "If this email is registered, a magic link has been sent. Please check your inbox.",
};

export async function POST(request: NextRequest) {
  // Reject non-JSON content types (CSRF defense)
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "invalid_content_type" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    // Form-format validation only — generic 400, no field hints (enumeration safety)
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { email } = parsed.data;

  // GATE 2 — server-side allowlist
  if (!isAllowedEmail(email)) {
    // Generic 200 success regardless — prevents email enumeration.
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  // Allowed email — request OTP via Supabase
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Hardcoded callback URL — defends against open redirect
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    // Log on server, return generic to client
    console.error("[send-magic-link] OTP send failed:", error.message);
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
