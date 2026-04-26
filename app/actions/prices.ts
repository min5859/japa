"use server";

import { revalidatePath } from "next/cache";
import { refreshAllPrices, refreshMarketIndices, refreshMarketHistory } from "@/lib/market";

export async function refreshPrices(): Promise<{ updated: number }> {
  const [portfolio, indices] = await Promise.all([
    refreshAllPrices(),
    refreshMarketIndices(),
    refreshMarketHistory()
  ]);
  revalidatePath("/", "layout");
  return { updated: portfolio.updated + indices };
}
