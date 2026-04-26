// Plan Ref: §5 — 거래 추가 페이지

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import type { Account } from "@/lib/accounts/schema";
import { TransactionForm } from "../transaction-form";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage({
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

  const { data: accountData, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !accountData) {
    notFound();
  }
  const account = accountData as Account;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
          >
            japa
          </Link>
          <Link
            href={`/accounts/${id}`}
            className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            / {account.broker}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / 거래 추가
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            거래 추가
          </h1>
          <TransactionForm accountId={id} defaultCurrency={account.currency} />
        </div>
      </section>
    </main>
  );
}
