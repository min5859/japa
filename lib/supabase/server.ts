// Design Ref: §3 — httpOnly + sameSite=strict + secure(prod) cookies via @supabase/ssr

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: isProd,
                // 'lax': 매직 링크/OAuth 같은 cross-site GET 네비게이션 시 쿠키 전송 허용.
                // PKCE code_verifier가 이메일 클릭 후에도 보존되어야 하므로 'strict'는 부적합.
                // CSRF 방어는 GET-only 쿠키이므로 충분.
                sameSite: "lax",
                path: "/",
              });
            });
          } catch {
            // Server Components cannot mutate cookies — safe to ignore.
            // Mutation happens via middleware refresh path instead.
          }
        },
      },
    },
  );
}
