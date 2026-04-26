// Design Ref: §3.1 (목록 조회) + §5 (와이어프레임)
// Plan SC: SC-1

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import type { Account } from "@/lib/accounts/schema";
import { AccountRow } from "./account-row";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login?error=session_expired");
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const accounts = (data ?? []) as Account[];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
            >
              japa
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / 계좌
            </span>
          </div>
          <Link
            href="/accounts/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + 새 계좌
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl p-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          >
            계좌 목록을 불러오지 못했습니다: {error.message}
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              아직 등록된 계좌가 없습니다.
            </p>
            <Link
              href="/accounts/new"
              className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 첫 계좌 추가
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {accounts.map((acc) => (
              <AccountRow key={acc.id} account={acc} />
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          총 {accounts.length}개 계좌
        </p>
      </section>
    </main>
  );
}
