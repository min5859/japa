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
                sameSite: "strict",
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
