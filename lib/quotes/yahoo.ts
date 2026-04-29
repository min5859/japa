// Plan Ref: yahoo-quotes §3, §6-2
// Yahoo Finance 시세 조회 — yahoo-finance2 라이브러리 사용.
//
// 배경(2026-04-29):
//   - 직접 v8 endpoint 호출은 Node TLS fingerprint(JA3) 차이로 봇 감지에 걸려
//     fetch/https.request 모두 HTTP 429를 받음.
//   - yahoo-finance2는 Yahoo crumb/cookie 인증과 다중 endpoint fallback을
//     라이브러리 내부에서 자동 처리하므로 위 문제를 회피.
//
// 시그니처(YahooQuote / YahooFetchResult / fetchYahooQuote)는 그대로 유지.
// 호출자(lib/quotes/refresh.ts)는 변경 불필요.

import "server-only";
import YahooFinance from "yahoo-finance2";

// v3은 클래스 기반. suppressNotices는 생성자 옵션으로 전달.
// telemetry/historical-deprecation notice가 콘솔로 새는 것을 억제.
const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

// 단일 심볼 quote의 응답 형태(라이브러리가 export하지 않는 필드 일부 포함).
type RawQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  currency?: string;
  regularMarketTime?: Date | number;
};

export type YahooQuote = {
  symbol: string;
  close: number;
  currency: string;
  asOf: Date; // regularMarketTime 기반
};

export type YahooFetchResult =
  | { ok: true; quote: YahooQuote }
  | {
      ok: false;
      reason: "not_found" | "rate_limited" | "network" | "parse";
      detail?: string;
    };

export async function fetchYahooQuote(
  symbol: string,
): Promise<YahooFetchResult> {
  let q: unknown;
  try {
    q = await yahooFinance.quote(symbol);
  } catch (e) {
    return classifyError(e);
  }

  // quote()는 단일 심볼에서 객체, 배열 입력 시 배열을 반환. 단일 심볼 입력이므로
  // 배열로 오면 첫 항목 사용.
  const result = (Array.isArray(q) ? q[0] : q) as RawQuote | null | undefined;
  if (!result || typeof result !== "object") {
    return { ok: false, reason: "not_found", detail: "empty result" };
  }

  const close = result.regularMarketPrice;
  const currency = result.currency;
  const ts = result.regularMarketTime;
  if (
    typeof close !== "number" ||
    !Number.isFinite(close) ||
    close <= 0 ||
    typeof currency !== "string"
  ) {
    return {
      ok: false,
      reason: "parse",
      detail: "missing regularMarketPrice/currency",
    };
  }

  // regularMarketTime은 라이브러리 버전에 따라 Date | number(epoch sec) | undefined.
  const asOf =
    ts instanceof Date
      ? ts
      : typeof ts === "number"
        ? new Date(ts * 1000)
        : new Date();

  return {
    ok: true,
    quote: {
      symbol: result.symbol ?? symbol,
      close,
      currency,
      asOf,
    },
  };
}

function classifyError(e: unknown): YahooFetchResult {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not\s*found|no\s*data|invalid\s*symbol|symbol\s*not\s*found/i.test(msg)) {
    return { ok: false, reason: "not_found", detail: msg };
  }
  if (/\b429\b|rate[\s-]?limit|too\s*many\s*requests/i.test(msg)) {
    return { ok: false, reason: "rate_limited", detail: msg };
  }
  if (/timeout|ECONN|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(msg)) {
    return { ok: false, reason: "network", detail: msg };
  }
  return { ok: false, reason: "network", detail: msg };
}
