// Plan Ref: yahoo-quotes §3, §6-1

import type { Market } from "@/lib/transactions/schema";

/**
 * Holdings.ticker + market → Yahoo 심볼 후보 배열.
 * 첫 번째 항목을 우선 시도하고, 실패 시 다음 항목으로 fallback.
 *
 * KR: KOSPI/KOSDAQ 구분이 holdings에 없으므로 .KS → .KQ fallback.
 * JP: 도쿄증권거래소 .T.
 * US/OTHER: 그대로.
 */
export function toYahooSymbols(ticker: string, market: Market): string[] {
  const t = ticker.trim().toUpperCase();
  if (!t) return [];

  switch (market) {
    case "KR":
      return [`${t}.KS`, `${t}.KQ`];
    case "JP":
      return [`${t}.T`];
    case "US":
    case "OTHER":
    default:
      return [t];
  }
}
