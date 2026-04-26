// Plan Ref: §5 — 거래 행 + 편집·삭제 버튼

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions/schema";
import { deleteTransaction } from "./actions";

const TYPE_BADGE_COLORS: Record<TransactionType, string> = {
  buy: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sell: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  dividend: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  interest: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  fee: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export function TransactionRow({
  accountId,
  tx,
  ticker,
}: {
  accountId: string;
  tx: Transaction;
  ticker: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `${TRANSACTION_TYPE_LABELS[tx.type]} 거래를 삭제하시겠습니까?\n\n` +
        "이 거래로 인한 보유종목·평균단가가 자동 재계산됩니다.\n" +
        "되돌릴 수 없습니다.",
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(accountId, tx.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const isTrade = tx.type === "buy" || tx.type === "sell";

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-gray-500 dark:text-gray-400">{tx.trade_date}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_COLORS[tx.type]}`}
        >
          {TRANSACTION_TYPE_LABELS[tx.type]}
        </span>
        {isTrade && ticker && (
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {ticker}
          </span>
        )}
        {isTrade ? (
          <span className="text-gray-700 dark:text-gray-300">
            {tx.quantity}주 × {tx.price?.toLocaleString()} {tx.currency}
          </span>
        ) : (
          <span className="text-gray-700 dark:text-gray-300">
            {tx.amount.toLocaleString()} {tx.currency}
          </span>
        )}
        {tx.fee > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            수수료 {tx.fee.toLocaleString()}
          </span>
        )}
        {tx.tax_withheld > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            원천징수 {tx.tax_withheld.toLocaleString()}
          </span>
        )}
      </div>

      {tx.memo && (
        <p className="text-xs text-gray-600 dark:text-gray-400">{tx.memo}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/accounts/${accountId}/transactions/${tx.id}/edit`}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          편집
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
        >
          {pending ? "..." : "삭제"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
    </li>
  );
}
