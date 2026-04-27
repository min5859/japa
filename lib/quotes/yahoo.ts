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
const RATE_LIMIT_BACKOFF_MS = 8_000;
const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchYahooQuote(
  symbol: string,
): Promise<YahooFetchResult> {
  // 1차: query1 시도
  const first = await fetchYahooQuoteOnce(symbol, HOSTS[0]);
  if (first.ok) return first;
  // not_found는 호스트 바꿔도 결과 같음
  if (first.reason === "not_found") return first;

  // 2차: 429이면 백오프 후 query2로 재시도 (TLS 지문/host 분산 효과)
  if (first.reason === "rate_limited") {
    await sleep(RATE_LIMIT_BACKOFF_MS);
    const second = await fetchYahooQuoteOnce(symbol, HOSTS[1]);
    if (second.ok) return second;
    if (second.reason === "rate_limited") {
      // 마지막 한 번 더 query1 백오프 재시도
      await sleep(RATE_LIMIT_BACKOFF_MS);
      return fetchYahooQuoteOnce(symbol, HOSTS[0]);
    }
    return second;
  }
  // network/parse — 호스트 바꿔도 비슷할 가능성 크지만 한번 더 시도
  return fetchYahooQuoteOnce(symbol, HOSTS[1]);
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

async function fetchYahooQuoteOnce(
  symbol: string,
  host: string,
): Promise<YahooFetchResult> {
  const url = `${host}/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=1d&range=5d`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        // 브라우저 fetch처럼 보이게 — 단순 UA만으로는 Yahoo 봇 감지에 걸림
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Origin: "https://finance.yahoo.com",
        Referer: "https://finance.yahoo.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
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
