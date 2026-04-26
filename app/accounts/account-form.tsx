// Design Ref: §5 — 와이어프레임 (생성·편집 공용 폼)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_DESCRIPTIONS,
  CURRENCIES,
  type Account,
  type AccountFormInput,
  type AccountType,
  type Currency,
} from "@/lib/accounts/schema";
import { createAccount, updateAccount } from "./actions";

type Props = {
  account?: Account;
};

export function AccountForm({ account }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AccountFormInput>({
    broker: account?.broker ?? "",
    account_type: (account?.account_type as AccountType) ?? "general",
    currency: ((account?.currency as Currency) ?? "KRW") as Currency,
    name: account?.name ?? "",
  });

  const isEdit = Boolean(account);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit && account
        ? await updateAccount(account.id, form)
        : await createAccount(form);

      if (result && !result.ok) {
        setError(result.error);
      }
      // ok 또는 redirect 시 별도 처리 불필요 (Server Action이 redirect)
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="증권사·은행" required>
        <input
          type="text"
          required
          maxLength={100}
          value={form.broker}
          onChange={(e) => setForm({ ...form, broker: e.target.value })}
          placeholder="예: 키움증권, 미래에셋, 신한은행"
          disabled={pending}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </Field>

      <Field label="계좌 유형" required>
        <select
          required
          value={form.account_type}
          onChange={(e) =>
            setForm({ ...form, account_type: e.target.value as AccountType })
          }
          disabled={pending}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {ACCOUNT_TYPE_DESCRIPTIONS[form.account_type]}
        </p>
      </Field>

      <Field label="기준 통화" required>
        <select
          required
          value={form.currency}
          onChange={(e) =>
            setForm({ ...form, currency: e.target.value as Currency })
          }
          disabled={pending}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="별칭 (선택)">
        <input
          type="text"
          maxLength={100}
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="예: 메인 ISA, 미국주식 계좌"
          disabled={pending}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/accounts")}
          disabled={pending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending || !form.broker.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {pending ? "저장 중..." : isEdit ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
