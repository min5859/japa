"use server";

import { revalidatePath } from "next/cache";
import { refreshAllPrices, refreshMarketIndices } from "@/lib/market";

export type RefreshPricesResult = {
  updated: number;
  attempted: number;
  indicesUpdated: number;
  failed: { symbol: string; reason: string }[];
  skippedNoSymbol: { id: string; name: string }[];
};

export async function refreshPrices(): Promise<RefreshPricesResult> {
  const [portfolio, indices] = await Promise.all([
    refreshAllPrices(),
    refreshMarketIndices()
  ]);
  revalidatePath("/", "layout");
  return {
    updated: portfolio.updated,
    attempted: portfolio.attempted,
    indicesUpdated: indices,
    failed: portfolio.failed,
    skippedNoSymbol: portfolio.skippedNoSymbol
  };
}
