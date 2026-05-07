import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const BodySchema = z.object({
  email: z.string().email().toLowerCase(),
});

const GENERIC_RESPONSE = {
  ok: true,
  message: "이메일이 등록된 주소라면 매직 링크가 발송됐습니다. 받은편지함을 확인하세요.",
};

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Generic 200 even when email isn't allowed — prevents enumeration.
  if (!isAllowedEmail(email)) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("[send-magic-link] OTP send failed:", error.message);
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
