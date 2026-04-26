// Design Ref: §2 — Browser client (Client Components only)
// Phase 1에서는 거의 사용하지 않지만, 추후 클라이언트 측 실시간 구독 등에 사용 예정.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
