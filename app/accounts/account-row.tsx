// Design Ref: §5 — 행 + 편집·삭제 버튼

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
} from "@/lib/accounts/schema";
import { deleteAccount } from "./actions";

export function AccountRow({ account }: { account: Account }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const label = account.name?.trim() || account.broker;
    const confirmed = window.confirm(
      `"${label}" 계좌를 삭제하시겠습니까?\n\n` +
        "⚠️ 이 계좌의 모든 보유종목·거래내역도 함께 삭제됩니다 (cascade).\n" +
        "되돌릴 수 없습니다.",
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(account.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {account.broker}
        </span>
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type}
        </span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {account.currency}
        </span>
        {account.name && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {account.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          등록: {new Date(account.created_at).toLocaleDateString("ko-KR")}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/accounts/${account.id}`}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            상세
          </Link>
          <Link
            href={`/accounts/${account.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            편집
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            {pending ? "삭제 중..." : "삭제"}
          </button>
        </div>
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
