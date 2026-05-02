"use server";

import { lookupSymbol, type SymbolLookup } from "@/lib/market";

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
