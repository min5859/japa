"use server";

import { revalidatePath } from "next/cache";
import { refreshAllPrices, refreshMarketIndices } from "@/lib/market";

export async function refreshPrices(): Promise<{ updated: number }> {
  const [portfolio, indices] = await Promise.all([
    refreshAllPrices(),
    refreshMarketIndices()
  ]);
  revalidatePath("/", "layout");
  return { updated: portfolio.updated + indices };
}
