// Design Ref: §8 — protected dashboard stub for Phase 1
// Plan SC: SC-2 (로그인 성공 후 진입 화면)

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — middleware should already have blocked this case.
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login?error=session_expired");
  }

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
            인증 시스템이 정상적으로 동작합니다. 자산 데이터 입력·대시보드 위젯은
            다음 Step에서 구현됩니다.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PlaceholderCard title="총 자산" value="—" hint="Step 7에서 구현" />
          <PlaceholderCard title="자산군 비중" value="—" hint="Step 7에서 구현" />
          <PlaceholderCard title="계좌 수" value="0" hint="Step 4에서 구현" />
        </div>
      </section>
    </main>
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
