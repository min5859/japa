// Plan Ref: yahoo-quotes §5

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshQuotesForAccount } from "@/lib/quotes/refresh";

export function RefreshQuotesButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function handleClick() {
    setMsg(null);
    startTransition(async () => {
      const r = await refreshQuotesForAccount(accountId);
      if (!r.ok) {
        setMsg({ kind: "err", text: r.error });
        return;
      }
      const time = new Date(r.at).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (r.failed.length === 0) {
        setMsg({
          kind: "ok",
          text: `✓ ${r.updated}종목 갱신 완료 (${time})`,
        });
      } else {
        const failedList = r.failed.map((f) => f.ticker).join(", ");
        setMsg({
          kind: "err",
          text: `${r.updated}종목 성공, ${r.failed.length}종목 실패: ${failedList}`,
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {pending ? "갱신 중..." : "🔄 시세 갱신"}
      </button>
      {msg && (
        <p
          role={msg.kind === "err" ? "alert" : "status"}
          className={
            "max-w-md text-right text-xs " +
            (msg.kind === "ok"
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400")
          }
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
