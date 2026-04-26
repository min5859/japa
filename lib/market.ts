import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@prisma/client";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Yahoo Finance FX symbols: <from>KRW=X
const FX_SYMBOLS: Partial<Record<Currency, string>> = {
  USD: "USDKRW=X",
  EUR: "EURKRW=X",
  JPY: "JPYKRW=X",
  CNY: "CNYKRW=X",
  GBP: "GBPKRW=X",
  HKD: "HKDKRW=X",
  SGD: "SGDKRW=X"
};

export function fxSymbol(currency: Currency): string | undefined {
  return FX_SYMBOLS[currency];
}

async function fetchQuotePrice(symbol: string): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(symbol);
    return (result?.regularMarketPrice as number | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Fetch live prices for a list of symbols and upsert into PriceCache. */
export async function refreshSymbols(symbols: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const priceMap = new Map<string, number>();

  await Promise.allSettled(
    unique.map(async (symbol) => {
      const price = await fetchQuotePrice(symbol);
      if (price !== null) {
        priceMap.set(symbol, price);
        await prisma.priceCache.upsert({
          where: { symbol },
          update: { price, fetchedAt: new Date() },
          create: { symbol, price }
        });
      }
    })
  );

  return priceMap;
}

/** Collect all symbols (holdings + FX) that need refreshing and update cache. */
export async function refreshAllPrices(): Promise<{ updated: number }> {
  const [holdings, accounts] = await Promise.all([
    prisma.holding.findMany({
      select: { symbol: true, currency: true },
      distinct: ["symbol", "currency"]
    }),
    prisma.account.findMany({
      select: { currency: true },
      distinct: ["currency"]
    })
  ]);

  const symbols: string[] = [];
  const fxAdded = new Set<string>();

  for (const h of holdings) {
    if (h.symbol) symbols.push(h.symbol);
    if (h.currency !== "KRW") {
      const fx = FX_SYMBOLS[h.currency];
      if (fx && !fxAdded.has(fx)) { symbols.push(fx); fxAdded.add(fx); }
    }
  }

  for (const a of accounts) {
    if (a.currency !== "KRW") {
      const fx = FX_SYMBOLS[a.currency];
      if (fx && !fxAdded.has(fx)) { symbols.push(fx); fxAdded.add(fx); }
    }
  }

  const priceMap = await refreshSymbols(symbols);
  return { updated: priceMap.size };
}

// ─── Market Indices ───────────────────────────────────────────────────────────

const INDICES_CONFIG = [
  { symbol: "^KS11",    name: "KOSPI",       currency: "KRW", isYield: false },
  { symbol: "^KQ11",    name: "KOSDAQ",      currency: "KRW", isYield: false },
  { symbol: "^GSPC",    name: "S&P 500",     currency: "USD", isYield: false },
  { symbol: "^IXIC",    name: "NASDAQ",      currency: "USD", isYield: false },
  { symbol: "^DJI",     name: "다우존스",    currency: "USD", isYield: false },
  { symbol: "^N225",    name: "닛케이",      currency: "JPY", isYield: false },
  { symbol: "USDKRW=X", name: "달러/원",     currency: "KRW", isYield: false },
  { symbol: "^TNX",     name: "미국채 10Y",  currency: "USD", isYield: true  },
] as const;

export type MarketIndexRow = {
  symbol: string;
  name: string;
  currency: string;
  isYield: boolean;
  price: number;
  previousClose: number;
  changePercent: number;
  fetchedAt: Date;
};

const EMPTY_INDICES: MarketIndexRow[] = INDICES_CONFIG.map(
  ({ symbol, name, currency, isYield }) => ({
    symbol, name, currency, isYield,
    price: 0, previousClose: 0, changePercent: 0, fetchedAt: new Date(0)
  })
);

export async function refreshMarketIndices(): Promise<number> {
  let updated = 0;
  await Promise.allSettled(
    INDICES_CONFIG.map(async ({ symbol, name, currency, isYield }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yahooFinance.quote(symbol);
        const price: number | undefined = q?.regularMarketPrice;
        const previousClose: number | undefined = q?.regularMarketPreviousClose ?? q?.regularMarketOpen;
        if (price == null || !previousClose) {
          console.warn(`[MarketIndex] ${symbol}: price=${price} previousClose=${previousClose}`);
          return;
        }
        const changePercent = Number((((price - previousClose) / previousClose) * 100).toFixed(4));
        await prisma.marketIndex.upsert({
          where: { symbol },
          update: { name, price, previousClose, changePercent, currency, isYield, fetchedAt: new Date() },
          create: { symbol, name, price, previousClose, changePercent, currency, isYield }
        });
        updated++;
      } catch (e) {
        console.error(`[MarketIndex] ${symbol} failed:`, e);
      }
    })
  );
  return updated;
}

export async function getMarketIndices(): Promise<MarketIndexRow[]> {
  const rows = await prisma.marketIndex.findMany();
  const bySymbol = new Map(
    rows.map((r) => [r.symbol, {
      symbol: r.symbol, name: r.name, currency: r.currency, isYield: r.isYield,
      price: Number(r.price), previousClose: Number(r.previousClose),
      changePercent: Number(r.changePercent), fetchedAt: r.fetchedAt,
    }])
  );
  return INDICES_CONFIG.map(({ symbol, name, currency, isYield }) =>
    bySymbol.get(symbol) ?? { symbol, name, currency, isYield, price: 0, previousClose: 0, changePercent: 0, fetchedAt: new Date(0) }
  );
}

export type HistoryPoint = { date: string; value: number };

export async function refreshMarketHistory(): Promise<void> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 1);

  await Promise.allSettled(
    INDICES_CONFIG.map(async ({ symbol }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = await yahooFinance.historical(symbol, {
          period1,
          interval: "1d"
        });
        if (!rows?.length) return;
        await prisma.$transaction(
          rows.map((r) =>
            prisma.marketIndexHistory.upsert({
              where: { symbol_date: { symbol, date: new Date(r.date) } },
              update: { open: r.open ?? r.close, high: r.high ?? r.close, low: r.low ?? r.close, close: r.close },
              create: { symbol, date: new Date(r.date), open: r.open ?? r.close, high: r.high ?? r.close, low: r.low ?? r.close, close: r.close }
            })
          )
        );
      } catch (e) {
        console.error(`[MarketHistory] ${symbol} failed:`, e);
      }
    })
  );
}

export async function getMarketHistory(symbol: string, days = 365): Promise<HistoryPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await prisma.marketIndexHistory.findMany({
    where: { symbol, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, close: true }
  });
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: Number(r.close)
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

/** Load currently cached prices for given symbols. */
export async function getCachedPrices(symbols: string[]): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();
  const rows = await prisma.priceCache.findMany({
    where: { symbol: { in: symbols } }
  });
  return new Map(rows.map((r) => [r.symbol, Number(r.price)]));
}

/** Build symbol list from holdings and return cached prices. */
export async function getPricesForPortfolio(): Promise<{
  prices: Map<string, number>;
  fxRates: Map<string, number>;
}> {
  const holdings = await prisma.holding.findMany({
    select: { symbol: true },
    distinct: ["symbol"]
  });

  const stockSymbols = holdings.map((h) => h.symbol).filter(Boolean) as string[];
  const allFxSymbols = Object.values(FX_SYMBOLS) as string[];
  const cached = await getCachedPrices([...stockSymbols, ...allFxSymbols]);

  const prices = new Map<string, number>();
  for (const sym of stockSymbols) {
    const p = cached.get(sym);
    if (p !== undefined) prices.set(sym, p);
  }

  const fxRates = new Map<string, number>();
  for (const [currency, fxSym] of Object.entries(FX_SYMBOLS)) {
    const rate = cached.get(fxSym);
    if (rate !== undefined) fxRates.set(currency, rate);
  }

  return { prices, fxRates };
}
