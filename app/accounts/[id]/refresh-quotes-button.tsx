// Plan Ref: yahoo-quotes §5

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshQuotesForAccount } from "@/lib/quotes/refresh";

export function RefreshQuotesButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string; failed?: Array<{ ticker: string; reason: string }> }
    | null
  >(null);

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
        setMsg({
          kind: "err",
          text: `${r.updated}종목 성공, ${r.failed.length}종목 실패`,
          failed: r.failed,
        });
      }
      router.refresh();
    });
  }

  function reasonHint(reason: string): string {
    const r = reason.toLowerCase();
    if (r.startsWith("not_found")) {
      return "Yahoo에서 못 찾음 — 티커 또는 시장(KR/US/JP) 설정을 확인하세요";
    }
    if (r.startsWith("rate_limited")) {
      return "Yahoo 호출 제한 — 잠시 후 다시 시도";
    }
    if (r.startsWith("network")) {
      return "네트워크/타임아웃 — 다시 시도";
    }
    if (r.startsWith("parse")) {
      return "응답 형식 오류 — 보고 필요";
    }
    return reason;
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
        <div
          role={msg.kind === "err" ? "alert" : "status"}
          className={
            "max-w-md text-right text-xs " +
            (msg.kind === "ok"
              ? "text-green-700 dark:text-green-400"
              : "text-red-700 dark:text-red-400")
          }
        >
          <p>{msg.text}</p>
          {msg.kind === "err" && msg.failed && msg.failed.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {msg.failed.map((f) => (
                <li key={f.ticker} className="text-[11px]">
                  <span className="font-mono font-medium">{f.ticker}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    — {reasonHint(f.reason)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
