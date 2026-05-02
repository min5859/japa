import Link from "next/link";
import { Plus } from "lucide-react";
import { lookupQuoteDetail, fetchSymbolHistory, searchSymbols } from "@/lib/market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuoteSearchForm } from "@/components/quote-search-form";
import { MarketChart } from "@/components/market-chart";

const QUOTE_TYPE_LABELS: Record<string, string> = {
  EQUITY: "주식",
  ETF: "ETF",
  MUTUALFUND: "펀드",
  CRYPTOCURRENCY: "암호화폐",
  CURRENCY: "통화"
};

/** Tickers we can look up directly without going through search. */
function looksLikeTicker(input: string): boolean {
  // 6 digits (KOSPI/KOSDAQ), or alphanumerics with allowed punctuation (e.g. AAPL, BRK.B, 005930.KS)
  if (/^\d{6}$/.test(input)) return true;
  return /^[A-Za-z0-9.\-^=]+$/.test(input);
}

/** Yahoo Finance search API rejects CJK characters with BadRequestError. */
function hasCjk(input: string): boolean {
  return /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(input);
}

export const dynamic = "force-dynamic";

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatMarketCap(value: number, currency: string): string {
  // 1e12 = 조 (KRW) / trillion (USD)
  if (currency === "KRW") {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}조`;
    if (value >= 1e8) return `${(value / 1e8).toFixed(0)}억`;
    return formatPrice(value, currency);
  }
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${formatPrice(value, currency)}`;
}

export default async function QuotePage({
  searchParams
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { symbol } = await searchParams;
  const trimmed = symbol?.trim() ?? "";

  // Strategy:
  // - Empty input → show landing
  // - Looks like a ticker → try direct lookup first; if it misses, fall back to search
  // - Otherwise (company name, Korean text, etc.) → search and show candidates
  let quote = null;
  let candidates: Awaited<ReturnType<typeof searchSymbols>> = [];
  const cjkBlocked = trimmed && hasCjk(trimmed);

  if (trimmed) {
    if (looksLikeTicker(trimmed)) {
      quote = await lookupQuoteDetail(trimmed);
    }
    // Yahoo's search API rejects CJK; skip the call and fall through to a
    // friendlier message instead of returning an unrelated empty list.
    if (!quote && !cjkBlocked) {
      candidates = await searchSymbols(trimmed, 10);
    }
  }

  const history = quote ? await fetchSymbolHistory(quote.symbol, 365) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">시세 조회</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          보유 여부와 무관하게 임의 종목의 현재 시세와 1년 차트를 조회합니다.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <QuoteSearchForm defaultValue={trimmed} />
        </CardContent>
      </Card>

      {trimmed && !quote && candidates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              검색 결과 ({candidates.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              원하는 종목을 클릭하면 시세를 조회합니다.
            </p>
          </CardHeader>
          <CardContent className="divide-y">
            {candidates.map((c) => (
              <Link
                key={c.symbol}
                href={`/quote?symbol=${encodeURIComponent(c.symbol)}`}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-muted/50 -mx-6 px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{c.symbol}</span>
                    {c.exchange && ` · ${c.exchange}`}
                    {` · ${QUOTE_TYPE_LABELS[c.quoteType] ?? c.quoteType}`}
                  </p>
                </div>
                <span className="text-xs text-primary">조회 →</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {trimmed && !quote && candidates.length === 0 && (
        <Card>
          <CardContent className="space-y-2 py-10 text-center text-sm text-muted-foreground">
            <p>
              {`검색 결과가 없습니다: `}
              <span className="font-mono">{trimmed}</span>
            </p>
            {cjkBlocked && (
              <p className="text-xs">
                Yahoo Finance 검색은 한글을 지원하지 않습니다. 영문
                회사명(예: <span className="font-mono">samsung</span>) 또는
                6자리 종목 코드로 시도해 주세요.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {quote && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{quote.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{quote.symbol}</span>
                    {quote.exchange && ` · ${quote.exchange}`}
                    {` · ${quote.currency}`}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/holdings/new?symbol=${encodeURIComponent(quote.symbol)}&name=${encodeURIComponent(quote.name)}&currency=${quote.currency}`}
                  >
                    <Plus className="h-4 w-4" />
                    내 보유에 추가
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <MarketChart
                data={history}
                name={quote.name}
                isYield={false}
                currency={quote.currency}
                currentPrice={quote.price}
                changePercent={quote.changePercent ?? 0}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="space-y-1 py-5">
                <p className="text-xs text-muted-foreground">전일 종가</p>
                <p className="text-lg font-semibold">
                  {quote.previousClose != null
                    ? formatPrice(quote.previousClose, quote.currency)
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1 py-5">
                <p className="text-xs text-muted-foreground">변동</p>
                <p
                  className={`text-lg font-semibold ${
                    (quote.change ?? 0) > 0
                      ? "text-red-500"
                      : (quote.change ?? 0) < 0
                        ? "text-blue-500"
                        : ""
                  }`}
                >
                  {quote.change != null
                    ? `${quote.change > 0 ? "+" : ""}${formatPrice(quote.change, quote.currency)}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1 py-5">
                <p className="text-xs text-muted-foreground">52주 최고/최저</p>
                <p className="text-sm font-medium">
                  {quote.fiftyTwoWeekHigh != null
                    ? formatPrice(quote.fiftyTwoWeekHigh, quote.currency)
                    : "—"}
                  {" / "}
                  {quote.fiftyTwoWeekLow != null
                    ? formatPrice(quote.fiftyTwoWeekLow, quote.currency)
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1 py-5">
                <p className="text-xs text-muted-foreground">시가총액</p>
                <p className="text-lg font-semibold">
                  {quote.marketCap != null
                    ? formatMarketCap(quote.marketCap, quote.currency)
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!trimmed && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p>종목 코드 또는 회사명을 입력해 조회하세요.</p>
            <p className="mt-2 text-xs">
              · 6자리 숫자 → KOSPI/KOSDAQ 자동 판별 (예:{" "}
              <Link href="/quote?symbol=005930" className="font-mono underline hover:text-foreground">
                005930
              </Link>
              )
              <br />
              · 영문 티커 → Yahoo Finance에 그대로 (예:{" "}
              <Link href="/quote?symbol=AAPL" className="font-mono underline hover:text-foreground">
                AAPL
              </Link>
              )
              <br />
              · 회사명(영문) → 후보 목록에서 선택 (예:{" "}
              <Link href="/quote?symbol=samsung" className="underline hover:text-foreground">
                samsung
              </Link>
              ,{" "}
              <Link href="/quote?symbol=apple" className="underline hover:text-foreground">
                apple
              </Link>
              ). Yahoo 검색은 한글 미지원.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
