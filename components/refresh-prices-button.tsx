"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshPrices } from "@/app/actions/prices";

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  function handleClick() {
    setLastResult(null);
    startTransition(async () => {
      const { updated } = await refreshPrices();
      setLastResult(`${updated}개 가격 업데이트됨`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {lastResult && (
        <span className="text-xs text-muted-foreground">{lastResult}</span>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "새로고침 중..." : "시세 새로고침"}
      </Button>
    </div>
  );
}
