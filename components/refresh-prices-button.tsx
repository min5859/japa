"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshPrices, type RefreshPricesResult } from "@/app/actions/prices";

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RefreshPricesResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  function handleClick() {
    setResult(null);
    setShowDetail(false);
    startTransition(async () => {
      const r = await refreshPrices();
      setResult(r);
    });
  }

  const hasIssues =
    !!result && (result.failed.length > 0 || result.skippedNoSymbol.length > 0);
  const cooldown = result?.cooldownRemainingSeconds;

  return (
    <div className="relative flex items-center gap-2">
      {result && cooldown ? (
        <span className="hidden text-xs text-amber-600 sm:inline">
          {cooldown}초 후 재시도
        </span>
      ) : result ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          종목 {result.updated}/{result.attempted} · 지수 {result.indicesUpdated}
        </span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
        title="시세 새로고침"
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">
          {isPending ? "새로고침 중..." : "시세 새로고침"}
        </span>
      </Button>
      {hasIssues && (
        <Button
          size="sm"
          variant="ghost"
          className="text-amber-600 hover:text-amber-700"
          onClick={() => setShowDetail((v) => !v)}
          title="실패 종목 보기"
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
      )}
      {hasIssues && showDetail && result && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border bg-popover p-3 text-xs shadow-md">
          {result.failed.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 font-semibold text-amber-600">
                업데이트 실패 ({result.failed.length})
              </p>
              <ul className="space-y-1">
                {result.failed.map((f) => (
                  <li key={f.symbol} className="text-muted-foreground">
                    <span className="font-mono text-foreground">{f.symbol}</span>
                    <span className="ml-1 break-all">— {f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.skippedNoSymbol.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-muted-foreground">
                심볼 미등록 ({result.skippedNoSymbol.length})
              </p>
              <ul className="space-y-1">
                {result.skippedNoSymbol.map((s) => (
                  <li key={s.id} className="text-muted-foreground">
                    {s.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
