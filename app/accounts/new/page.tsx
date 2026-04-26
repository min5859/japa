// Plan SC: SC-2 — 계좌 생성 페이지

import Link from "next/link";
import { AccountForm } from "../account-form";

export default function NewAccountPage() {
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
              / 계좌 / 새 계좌
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            새 계좌 추가
          </h1>
          <AccountForm />
        </div>
      </section>
    </main>
  );
}
