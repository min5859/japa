// Plan Ref: yahoo-quotes §3, §6-2
// Yahoo Finance v8 chart endpoint 직접 호출.
// 비공식 엔드포인트이므로 User-Agent 필수, 차단 시 fallback 없음 (TODO A2).

import "server-only";

export type YahooQuote = {
  symbol: string;
  close: number;
  currency: string;
  asOf: Date; // regularMarketTime 기반
};

export type YahooFetchResult =
  | { ok: true; quote: YahooQuote }
  | { ok: false; reason: "not_found" | "rate_limited" | "network" | "parse"; detail?: string };

const TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchYahooQuote(
  symbol: string,
): Promise<YahooFetchResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=5d`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    return {
      ok: false,
      reason: "network",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
  clearTimeout(timer);

  if (res.status === 429) {
    return { ok: false, reason: "rate_limited", detail: `HTTP 429` };
  }
  // Yahoo는 미존재 심볼에 대해 200 + error 객체 또는 404 둘 다 반환할 수 있음
  if (res.status === 404) {
    return { ok: false, reason: "not_found", detail: `HTTP 404` };
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "network",
      detail: `HTTP ${res.status}`,
    };
  }

  let json: YahooChartResponse;
  try {
    json = (await res.json()) as YahooChartResponse;
  } catch (e) {
    return {
      ok: false,
      reason: "parse",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  // Yahoo의 미존재 심볼: 200 + chart.error.code = "Not Found"
  const err = json.chart?.error;
  if (err) {
    if (
      err.code === "Not Found" ||
      err.description?.toLowerCase().includes("no data") ||
      err.description?.toLowerCase().includes("not found")
    ) {
      return { ok: false, reason: "not_found", detail: err.description };
    }
    return { ok: false, reason: "parse", detail: err.description };
  }

  const meta = json.chart?.result?.[0]?.meta;
  if (!meta) {
    return { ok: false, reason: "not_found", detail: "no result meta" };
  }
  const close = meta.regularMarketPrice;
  const currency = meta.currency;
  const ts = meta.regularMarketTime;
  if (
    typeof close !== "number" ||
    !Number.isFinite(close) ||
    close <= 0 ||
    typeof currency !== "string" ||
    typeof ts !== "number"
  ) {
    return { ok: false, reason: "parse", detail: "missing fields in meta" };
  }

  return {
    ok: true,
    quote: {
      symbol: meta.symbol ?? symbol,
      close,
      currency,
      asOf: new Date(ts * 1000),
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Yahoo v8 응답 형태 (필요한 필드만)
// ────────────────────────────────────────────────────────────────────────────
type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
};
