"use server";

import type { Currency } from "@prisma/client";
import {
  fxSymbol,
  getCachedPrices,
  lookupSymbol,
  refreshSymbols,
  type SymbolLookup,
} from "@/lib/market";

export type LookupSymbolResult =
  | { ok: true; data: SymbolLookup }
  | { ok: false; error: string };

export async function lookupSymbolAction(input: string): Promise<LookupSymbolResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "티커를 입력하세요." };

  try {
    const found = await lookupSymbol(trimmed);
    if (!found) return { ok: false, error: `종목을 찾을 수 없습니다: ${trimmed}` };
    return { ok: true, data: found };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "조회 실패" };
  }
}

export type FxRateResult =
  | { ok: true; rate: number; symbol: string | null }
  | { ok: false; error: string };

/** 해당 통화 → KRW 환율을 반환. KRW면 1. 캐시 없으면 즉시 refresh. */
export async function getFxRateAction(currency: Currency): Promise<FxRateResult> {
  if (currency === "KRW") return { ok: true, rate: 1, symbol: null };
  const sym = fxSymbol(currency);
  if (!sym) return { ok: false, error: `지원하지 않는 통화: ${currency}` };

  const cached = await getCachedPrices([sym]);
  let rate = cached.get(sym);
  if (rate == null) {
    await refreshSymbols([sym]).catch(() => {});
    const refreshed = await getCachedPrices([sym]);
    rate = refreshed.get(sym);
  }

  if (rate == null) return { ok: false, error: `환율 조회 실패: ${sym}` };
  return { ok: true, rate, symbol: sym };
}
