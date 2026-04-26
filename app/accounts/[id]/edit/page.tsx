// Plan SC: SC-4 — 계좌 편집 페이지

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import type { Account } from "@/lib/accounts/schema";
import { AccountForm } from "../../account-form";

export const dynamic = "force-dynamic";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const account = data as Account;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/accounts"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
            >
              japa
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / 계좌 / 편집
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            계좌 편집
          </h1>
          <AccountForm account={account} />
        </div>
      </section>
    </main>
  );
}
