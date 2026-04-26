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
