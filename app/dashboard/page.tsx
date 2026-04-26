// Design Ref: §8 — protected dashboard stub for Phase 1

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — middleware should already have blocked this case.
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login?error=session_expired");
  }

  // 계좌 수 조회 (RLS로 본인 것만 카운트)
  const { count: accountCount } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">japa</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <h2 className="text-lg font-semibold">✅ 로그인 성공</h2>
          <p className="mt-2 text-sm">
            지금부터 계좌·종목·거래를 입력하실 수 있습니다.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <LinkCard
            href="/accounts"
            title="계좌"
            value={(accountCount ?? 0).toString()}
            hint="등록된 계좌 수 — 클릭하여 관리"
          />
          <PlaceholderCard
            title="총 자산"
            value="—"
            hint="Step 7에서 구현"
          />
          <PlaceholderCard
            title="자산군 비중"
            value="—"
            hint="Step 7에서 구현"
          />
        </div>
      </section>
    </main>
  );
}

function LinkCard({
  href,
  title,
  value,
  hint,
}: {
  href: string;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    </Link>
  );
}

function PlaceholderCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    </div>
  );
}
