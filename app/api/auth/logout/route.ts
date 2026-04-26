// Design Ref: §6.3 — logout endpoint
// Plan SC: SC-6 (세션 쿠키 제거 + /login redirect)

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // @supabase/ssr가 쿠키 제거를 자동으로 처리. 클라이언트는 응답 후 router.push("/login").
  return NextResponse.json({ ok: true });
}
