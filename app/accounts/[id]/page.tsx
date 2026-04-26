// Plan Ref: §5 — 계좌 상세 (보유종목 + 거래내역)

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
} from "@/lib/accounts/schema";
import type { Holding, Transaction } from "@/lib/transactions/schema";
import { TransactionRow } from "./transactions/transaction-row";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
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

  const { data: accountData, error: accountErr } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (accountErr || !accountData) {
    notFound();
  }
  const account = accountData as Account;

  const { data: holdingsData } = await supabase
    .from("holdings")
    .select("*")
    .eq("account_id", id)
    .order("ticker", { ascending: true });
  const holdings = (holdingsData ?? []) as Holding[];

  const { data: txsData } = await supabase
    .from("transactions")
    .select("*, holdings(ticker, name)")
    .eq("account_id", id)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  // 거래 행에 ticker를 직접 붙여서 전달
  type TxWithJoin = Transaction & {
    holdings?: { ticker: string | null; name: string | null } | null;
  };
  const txs: Array<{ tx: Transaction; ticker: string | null }> = (
    (txsData ?? []) as TxWithJoin[]
  ).map((row) => ({
    tx: row,
    ticker: row.holdings?.ticker ?? null,
  }));

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
            <Link
              href="/accounts"
              className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              / 계좌
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              / {account.broker}
            </span>
          </div>
          <Link
            href={`/accounts/${id}/transactions/new`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + 거래 추가
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-6 p-6">
        {/* 계좌 헤더 카드 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {account.broker}
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type}
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {account.currency}
            </span>
            {account.name && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {account.name}
              </span>
            )}
          </div>
        </div>

        {/* 보유종목 */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            보유종목 ({holdings.length})
          </h2>
          {holdings.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              아직 보유종목이 없습니다. 매수 거래를 추가하면 자동으로 집계됩니다.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">티커</th>
                    <th className="px-3 py-2 text-left">시장</th>
                    <th className="px-3 py-2 text-left">종목명</th>
                    <th className="px-3 py-2 text-right">수량</th>
                    <th className="px-3 py-2 text-right">평균단가</th>
                    <th className="px-3 py-2 text-right">취득원가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {holdings.map((h) => {
                    const cost = Number(h.quantity) * Number(h.avg_cost_price);
                    return (
                      <tr key={h.id}>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                          {h.ticker}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {h.market}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          {h.name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {Number(h.quantity).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {Number(h.avg_cost_price).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                          {cost.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {h.cost_currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 거래내역 */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            거래내역 (최근 {txs.length}건)
          </h2>
          {txs.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              아직 거래내역이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {txs.map(({ tx, ticker }) => (
                <TransactionRow
                  key={tx.id}
                  accountId={id}
                  tx={tx}
                  ticker={ticker}
                />
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          ⚠️ 시세·평가금액은 Step 6 (Yahoo Finance 연동) 이후 표시됩니다.
        </p>
      </section>
    </main>
  );
}
