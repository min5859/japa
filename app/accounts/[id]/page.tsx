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
import { RefreshQuotesButton } from "./refresh-quotes-button";

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

  // 가장 최신 시세 조회 (각 ticker별로 가장 최근 date)
  type PriceRow = {
    ticker: string;
    date: string;
    close_price: number | string;
    currency: string;
  };
  const tickers = holdings.map((h) => h.ticker);
  let priceByTicker = new Map<string, PriceRow>();
  if (tickers.length > 0) {
    const { data: priceData } = await supabase
      .from("price_cache")
      .select("ticker, date, close_price, currency")
      .in("ticker", tickers)
      .order("date", { ascending: false });
    // ticker마다 첫 행(가장 최신)만 채택
    const tmp = new Map<string, PriceRow>();
    for (const row of (priceData ?? []) as PriceRow[]) {
      if (!tmp.has(row.ticker)) tmp.set(row.ticker, row);
    }
    priceByTicker = tmp;
  }

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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              보유종목 ({holdings.length})
            </h2>
            {holdings.length > 0 && <RefreshQuotesButton accountId={id} />}
          </div>
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
                    <th className="px-3 py-2 text-right">현재가</th>
                    <th className="px-3 py-2 text-right">평가금액</th>
                    <th className="px-3 py-2 text-right">수익률</th>
                    <th className="px-3 py-2 text-left">갱신일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {holdings.map((h) => {
                    const qty = Number(h.quantity);
                    const avg = Number(h.avg_cost_price);
                    const cost = qty * avg;
                    const price = priceByTicker.get(h.ticker);
                    const close = price ? Number(price.close_price) : null;
                    const sameCurrency =
                      price?.currency != null &&
                      price.currency === h.cost_currency;
                    const valuation =
                      close != null && sameCurrency ? qty * close : null;
                    const returnPct =
                      close != null && sameCurrency && avg > 0
                        ? (close / avg - 1) * 100
                        : null;
                    const returnColor =
                      returnPct == null
                        ? "text-gray-400 dark:text-gray-500"
                        : returnPct >= 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400";
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
                          {qty.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {avg.toLocaleString()}
                          <div className="text-[10px] text-gray-500 dark:text-gray-500">
                            취득 {cost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {h.cost_currency}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {close != null
                            ? close.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })
                            : "—"}
                          {price && !sameCurrency && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              통화 다름 ({price.currency} vs {h.cost_currency})
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {valuation != null
                            ? `${valuation.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${h.cost_currency}`
                            : "—"}
                        </td>
                        <td className={`px-3 py-2 text-right font-medium ${returnColor}`}>
                          {returnPct != null
                            ? `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">
                          {price?.date ?? (
                            <span className="text-amber-600 dark:text-amber-400">
                              갱신 필요
                            </span>
                          )}
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
          ⚠️ 시세는 Yahoo Finance 일일 종가(또는 실시간) 기반 참고용. 환율 변환은 Phase 2 적용 예정 — 통화가 다른 경우 수익률은 표시되지 않습니다.
        </p>
      </section>
    </main>
  );
}
