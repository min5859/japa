// Design Ref: §1 GATE 4 — root proxy (Next.js 16: middleware.ts → proxy.ts)
// Plan SC: SC-4 (보호 라우트 미인증 시 /login redirect)

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 모든 라우트에 적용하되 다음은 제외:
     * - _next/static, _next/image (Next 정적 자원)
     * - favicon.ico, image extensions
     * - 명시적 public 경로는 lib/supabase/middleware.ts에서 isPublicPath()로 다시 검증
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
